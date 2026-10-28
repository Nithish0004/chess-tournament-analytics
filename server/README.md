# Chess Tournament Management & Analytics API

Express 5 REST API for the Chess Tournament Management and Analytics system. Built with Node.js ES modules, `mysql2/promise` connection pooling, Zod validation, JWT authentication, and MySQL 8.0 stored procedures/views.

---

## Tech Stack

- **Runtime & Framework**: Node.js (ES Modules), Express 5
- **Database**: MySQL 8.0.16+ with InnoDB (CHECK constraints, Triggers, Stored Procedures, Views)
- **Driver**: `mysql2/promise` with connection pooling
- **Validation**: `zod`
- **Security & Auth**: `bcrypt` (password hashing), `jsonwebtoken` (JWT bearer authentication), `cors`
- **Config**: `dotenv`

---

## Directory Structure

```
server/
├── .env.example              # Environment variables template
├── package.json              # Express 5 dependencies and npm scripts
├── requests.http             # HTTP client collection for all endpoints
├── README.md                 # Setup and run instructions
├── scripts/
│   ├── seed-admin.js         # Seeds admin user into admin_user table
│   ├── seed-demo.js          # Populates 16 players, 2 tournaments, rounds & games
│   └── test-all-endpoints.js # Automated verification suite for all endpoints
└── src/
    ├── app.js                # Express app factory with route registrations
    ├── server.js             # Server entry point with graceful shutdown
    ├── config/
    │   └── db.js             # mysql2/promise connection pool configuration
    ├── controllers/
    │   ├── authController.js
    │   ├── playerController.js
    │   ├── tournamentController.js
    │   ├── roundController.js
    │   ├── gameController.js
    │   └── dashboardController.js
    ├── middleware/
    │   ├── authMiddleware.js     # Enforces JWT on POST/PUT endpoints
    │   ├── errorHandler.js       # Central error handler mapping MySQL error codes
    │   └── validateMiddleware.js # Zod request body validation
    ├── routes/
    │   ├── authRoutes.js
    │   ├── playerRoutes.js
    │   ├── tournamentRoutes.js
    │   ├── roundRoutes.js
    │   ├── gameRoutes.js
    │   └── dashboardRoutes.js
    └── utils/
        └── jwt.js            # JWT signing and verification helpers
```

---

## Setup Instructions

### 1. Prerequisites
- Node.js v18 or higher (tested on Node v25)
- MySQL 8.0.16 or higher running with `chess_db` database initialized from `sql/01_schema.sql` and `sql/02_routines.sql`.

### 2. Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Configure your `.env` settings:
```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=chess_admin
DB_PASSWORD=chess_password
DB_NAME=chess_db
JWT_SECRET=super_secret_jwt_chess_key_2026
PORT=5000
```
> **Security Note:** Never commit `.env` to version control. It is ignored in `.gitignore`.

### 3. Install Dependencies
```bash
cd server
npm install
```

### 4. Seed Database

#### Seed Admin User
```bash
# Default (username: admin, password: password123)
npm run seed:admin

# Or with custom credentials:
node scripts/seed-admin.js <username> <password>
```

#### Seed Demo Tournament Data
Creates 16 players, 2 tournaments, registrations, rounds, games, and records results through stored procedures:
```bash
npm run seed:demo
```

---

## Running the Server

### Development Mode (Node auto-reload)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```
The server will start at `http://localhost:5000`.

---

## Running Tests

Run the complete endpoint and error-mapping verification test suite:
```bash
node scripts/test-all-endpoints.js
```

---

## API Endpoints Reference

### Authentication
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | Public | Authenticates admin using bcrypt and returns JWT token |

### Players
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/players` | Public | List all players (supports `?q=` name search) |
| `POST` | `/api/players` | Protected | Create a new player |
| `GET` | `/api/players/:id` | Public | Get player details by ID |
| `PUT` | `/api/players/:id` | Protected | Update player details (ratings immutable; rejecting `current_rating` with 400) |
| `GET` | `/api/players/:id/analytics` | Public | Returns `v_player_performance`, `v_rating_progression`, and tournament history |

### Tournaments
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/tournaments` | Public | List all tournaments |
| `POST` | `/api/tournaments` | Protected | Create a new tournament |
| `GET` | `/api/tournaments/:id` | Public | Get tournament details |
| `PUT` | `/api/tournaments/:id` | Protected | Update tournament (including status: UPCOMING/ONGOING/COMPLETED) |
| `POST` | `/api/tournaments/:id/register` | Protected | Register player (`{ player_id }`) |
| `GET` | `/api/tournaments/:id/registrations` | Public | List registrations for tournament |
| `POST` | `/api/tournaments/:id/rounds` | Protected | Auto-creates next round (`round_no` auto-incremented) |
| `GET` | `/api/tournaments/:id/rounds` | Public | List rounds for tournament |
| `GET` | `/api/tournaments/:id/standings` | Public | Tournament standings from `v_leaderboard` |
| `GET` | `/api/tournaments/:id/analytics` | Public | Total games, win/draw counts, upsets (`v_upsets`), rating changes |

### Rounds & Games
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/rounds/:id/games` | Protected | Schedule a game (`{ board_no, white_player_id, black_player_id }`) |
| `GET` | `/api/rounds/:id/games` | Public | List all games and results in a round |
| `POST` | `/api/games/:id/result` | Protected | Record result (`{ outcome: 'WHITE' \| 'BLACK' \| 'DRAW' }`) via `CALL record_result(?, ?)` |

### Dashboard
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/dashboard` | Public | Top 10 by rating, outcome distribution, total upsets, recent upsets, and rating progression for top 5 |

---

## Architectural Rules & Implementation Details

1. **Parameterised Queries**: Every database query strictly uses `?` placeholders with parameter arrays. String concatenation is never used to construct SQL statements.
2. **Result Recording via Stored Procedure**: Results are recorded **ONLY** by calling `CALL record_result(?, ?)`. The application does not manually calculate Elo ratings or tournament points; the database transaction updates ratings, logs `rating_history`, updates game and round statuses, and calls `refresh_standings(p_tid)`. Ratings cannot be edited directly via `PUT /api/players/:id`.
3. **Database Views**:
   - `v_leaderboard`: Used for `/api/tournaments/:id/standings`.
   - `v_player_performance`: Used for `/api/players/:id/analytics`.
   - `v_rating_progression`: Used for player rating graphs and top 5 progression in dashboard.
   - `v_upsets`: Used for tournament analytics and dashboard upset tracking.
4. **Central Error Handler Mapping**:
   - `1062` (`ER_DUP_ENTRY`) $\rightarrow$ **409 Conflict** with generic message `"Duplicate entry"`
   - `1452` (`ER_NO_REFERENCED_ROW_2`) $\rightarrow$ **409 Conflict** with generic message `"Referenced record does not exist"`
   - `3819` (`ER_CHECK_CONSTRAINT_VIOLATED`) $\rightarrow$ **400 Bad Request**
   - `1644` (`ER_SIGNAL_EXCEPTION` from MySQL triggers/procedures) $\rightarrow$ **400 Bad Request** with MySQL error message
   - Everything else $\rightarrow$ **500 Internal Server Error** with generic message
5. **Authentication & Authorization**:
   - `GET` endpoints are open to the public.
   - `POST` and `PUT` endpoints require a valid JWT passed in the `Authorization: Bearer <token>` header.
