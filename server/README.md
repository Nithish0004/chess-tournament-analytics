# Chess Tournament Management & Analytics API

Express 5 REST API for the Chess Tournament Management and Analytics system. Built with Node.js ES modules, `mysql2/promise` connection pooling, Zod validation, role-based JWT authentication, rate limiting, Helmet, Nodemailer, and MySQL 8.0 stored procedures/views.

---

## Tech Stack

- **Runtime & Framework**: Node.js (ES Modules), Express 5
- **Database**: MySQL 8.0.16+ with InnoDB (CHECK constraints, Triggers, Stored Procedures, Views)
- **Driver**: `mysql2/promise` with connection pooling (strictly parameterised queries)
- **Validation**: `zod`
- **Security & Auth**: `bcrypt` (cost 12), `jsonwebtoken` (JWT bearer authentication, 8h expiry), `helmet`, `cors`, `express-rate-limit`
- **Mailing**: `nodemailer` (supports `console` and `smtp` transports)
- **Config**: `dotenv` with startup validation of required variables (`JWT_SECRET` min 32 chars)

---

## Directory Structure

```
server/
├── .env.example              # Environment variables template
├── package.json              # Express 5 dependencies and npm scripts
├── requests.http             # HTTP client collection for all endpoints
├── README.md                 # Setup and run instructions
├── scripts/
│   ├── seed-admin.js         # Upserts active, verified ADMIN into app_user
│   ├── seed-demo.js          # Populates 16 players, 2 tournaments, rounds & games
│   └── test-all-endpoints.js # Automated verification suite for auth, roles, and endpoints
└── src/
    ├── app.js                # Express app factory with helmet, cors, and route registrations
    ├── server.js             # Server entry point with graceful shutdown
    ├── config/
    │   ├── db.js             # mysql2/promise connection pool configuration
    │   └── env.js            # Environment validation (JWT_SECRET min 32 chars fail-fast)
    ├── controllers/
    │   ├── adminController.js # Admin user approval, suspension, and reactivation
    │   ├── authController.js  # Registration, email verify, login, password reset, profile
    │   ├── playerController.js
    │   ├── tournamentController.js
    │   ├── roundController.js
    │   ├── gameController.js
    │   └── dashboardController.js
    ├── middleware/
    │   ├── authMiddleware.js     # Enforces JWT + active status check + role/ownership checks
    │   ├── errorHandler.js       # Central error handler mapping MySQL error codes
    │   ├── rateLimitMiddleware.js # Rate limiting for auth and login
    │   └── validateMiddleware.js # Zod request body validation
    ├── routes/
    │   ├── adminRoutes.js
    │   ├── authRoutes.js
    │   ├── playerRoutes.js
    │   ├── tournamentRoutes.js
    │   ├── roundRoutes.js
    │   ├── gameRoutes.js
    │   └── dashboardRoutes.js
    ├── services/
    │   └── mailService.js        # Email dispatching (console / smtp) with HTML templates
    └── utils/
        ├── jwt.js                # JWT sign and verify helpers
        └── tokens.js             # 32-byte hex crypto token generation & SHA-256 hashing
```

---

## Environment Variables

Configure your `.env` (refer to `.env.example`):
```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=chess_admin
DB_PASSWORD=chess_password
DB_NAME=chess_db
PORT=5000
JWT_SECRET=chess_tournament_super_secret_jwt_key_2026_at_least_32_chars
CLIENT_URL=http://localhost:3000
MAIL_TRANSPORT=console
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASS=password
MAIL_FROM="Chess Tournament" <noreply@chess-tournament.com>
GOOGLE_CLIENT_ID=
```

> **Startup Requirement:** `JWT_SECRET` must be set and have a minimum length of 32 characters, or the application will throw a fatal error on startup.
> **Console Mail Transport:** In `MAIL_TRANSPORT=console` mode, verification and password-reset links are printed directly to the server terminal. Tokens are never logged otherwise.
> **CORS:** Restricted to `CLIENT_URL`.

---

## Setup & Running

### 1. Install Dependencies
```bash
cd server
npm install
```

### 2. Seed Admin User
Upserts an `ACTIVE`, `email_verified` ADMIN in `app_user`. All three arguments are required (`email`, `password`, `full_name`):
```bash
node scripts/seed-admin.js <email> <password> <full_name>
```
Example:
```bash
node scripts/seed-admin.js admin@example.com ReplaceWithStrongPassword123! "Site Administrator"
```

### 3. Start Server
```bash
# Development (with watch mode)
npm run dev

# Production
npm start
```

### 4. Run Test Suite
Runs the comprehensive verification suite against unique `@test.local` records and automatically cleans them up afterwards:
```bash
node scripts/test-all-endpoints.js
```

---

## Authentication & Authorization Model

### Roles & Permissions

| Role | Allowed Actions |
|---|---|
| **ADMIN** | Full access to all endpoints, user management (approve organizers, suspend/reactivate users), create and manage any tournament, round, game, and result. |
| **ORGANIZER** | Create tournaments (sets `tournament.created_by`), edit/status-change owned tournaments, register players, create rounds and games, record results for owned tournaments. Blocked from managing tournaments created by other organizers. |
| **PLAYER** | View data, update own player profile (`PUT /api/players/:id` where `id == player_id`), and self-register for upcoming tournaments via `POST /api/tournaments/:id/register-me`. Forbidden from creating tournaments, rounds, games, or recording results. |

### Database Status Check
The `authMiddleware` validates the JWT bearer token and **re-verifies the user's status (`ACTIVE`) in the database** on every request. If an admin suspends a user, the user is blocked immediately even if their token has not expired.

### Rate Limiting & Account Lockout
- **Rate Limit**: ~10 requests per 15 minutes per IP on `/api/auth` endpoints.
- **Password Lockout**: After 5 failed password attempts on an account, `locked_until` is set to `NOW() + 15 MINUTE`. Subsequent login attempts while locked return `429 Too Many Requests`.
- **Generic Responses**: `POST /api/auth/register`, `POST /api/auth/resend-verification`, and `POST /api/auth/forgot-password` return generic responses to prevent account enumeration.

### Tokens & Links
- Generated using `crypto.randomBytes(32).toString('hex')`.
- Only the **SHA-256 hash** (`auth_token.token_hash`) is stored in the database.
- Single-use: `used_at` timestamp is set upon redemption.
- **Verification links**: expire in 24 hours.
- **Password reset links**: expire in 1 hour.

---

## API Endpoints Reference

### Authentication (`/api/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register `PLAYER` or `ORGANIZER` (ADMIN prohibited). Sends verification email. |
| `POST` | `/api/auth/verify-email` | Public | Verifies email token (PLAYER $\rightarrow$ `ACTIVE`, ORGANIZER $\rightarrow$ `PENDING_APPROVAL`). |
| `POST` | `/api/auth/resend-verification` | Public | Resends verification email (60s cooldown per account). |
| `POST` | `/api/auth/login` | Public | Returns 8h JWT and user info. 5 failed attempts locks account for 15 min. |
| `POST` | `/api/auth/forgot-password` | Public | Generates single-use 1h reset link and sends email. |
| `POST` | `/api/auth/reset-password` | Public | Resets password using reset token and clears lockout. |
| `GET` | `/api/auth/me` | Authenticated | Returns current authenticated user and linked player profile. |
| `PUT` | `/api/auth/me/profile` | Authenticated | Update full_name, phone, country, date_of_birth, organization. |
| `POST` | `/api/auth/change-password` | Authenticated | Change account password with current and new password. |

### Admin Management (`/api/admin`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/admin/users?status=&role=` | ADMIN | Filter and list all users in `app_user`. |
| `POST` | `/api/admin/users/:id/approve` | ADMIN | Approves organizer in `PENDING_APPROVAL` to `ACTIVE` and sends approval email. |
| `POST` | `/api/admin/users/:id/suspend` | ADMIN | Suspends user account (admins cannot suspend themselves). |
| `POST` | `/api/admin/users/:id/reactivate` | ADMIN | Reactivates suspended user to `ACTIVE`. |

### Tournaments (`/api/tournaments`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/tournaments` | Authenticated | List all tournaments with player and round counts. |
| `GET` | `/api/tournaments/:id` | Authenticated | Get tournament by ID. |
| `POST` | `/api/tournaments` | ORGANIZER, ADMIN | Create tournament (sets `tournament.created_by = user_id`). |
| `PUT` | `/api/tournaments/:id` | Creator, ADMIN | Update tournament details or status. |
| `POST` | `/api/tournaments/:id/register` | Creator, ADMIN | Register player for tournament. |
| `POST` | `/api/tournaments/:id/register-me` | PLAYER | Self-register for upcoming tournament using token `player_id`. |
| `GET` | `/api/tournaments/:id/registrations` | Authenticated | List registrations for tournament. |
| `POST` | `/api/tournaments/:id/rounds` | Creator, ADMIN | Auto-increment round and schedule next round. |
| `GET` | `/api/tournaments/:id/rounds` | Authenticated | List rounds for tournament. |
| `GET` | `/api/tournaments/:id/standings` | Authenticated | Tournament standings from `v_leaderboard`. |
| `GET` | `/api/tournaments/:id/analytics` | Authenticated | Tournament match statistics, upsets, and rating changes. |
| `GET` | `/api/tournaments/:id/predictions` | Authenticated | Tournament performance predictions. |

### Players (`/api/players`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/players` | Authenticated | List all players (supports search `?q=`). |
| `GET` | `/api/players/:id` | Authenticated | Get player by ID. |
| `GET` | `/api/players/:id/analytics` | Authenticated | Player performance, progression, and match history. |
| `POST` | `/api/players` | ORGANIZER, ADMIN | Create player record directly. |
| `PUT` | `/api/players/:id` | Self (PLAYER), ORGANIZER, ADMIN | Update player profile (direct rating edits blocked). |

### Rounds & Games (`/api/rounds`, `/api/games`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/rounds/:id/games` | Authenticated | List games in round. |
| `POST` | `/api/rounds/:id/games` | Creator, ADMIN | Schedule board pairing in round. |
| `GET` | `/api/games/recent` | Authenticated | List recent match results. |
| `POST` | `/api/games/:id/result` | Creator, ADMIN | Record result (`CALL record_result(?, ?)`) and trigger rating updates. |

### Dashboard (`/api/dashboard`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/dashboard` | Authenticated | Aggregated stats, top players, recent activity, and upsets. |
