# Chess Tournament Management & Analytics API

Express 5 REST API for the Chess Tournament Management and Analytics system. Built with Node.js ES modules, `mysql2/promise` connection pooling, Zod validation, role-based JWT authentication, Google OAuth2 token verification, rate limiting, Helmet, Nodemailer, and MySQL 8.0 stored procedures/views.

---

## Tech Stack

- **Runtime & Framework**: Node.js (ES Modules), Express 5
- **Database**: MySQL 8.0.16+ with InnoDB (CHECK constraints, Triggers, Stored Procedures, Views)
- **Driver**: `mysql2/promise` with connection pooling (strictly parameterised queries)
- **Validation**: `zod`
- **Security & Auth**: `bcrypt` (cost 12), `jsonwebtoken` (JWT bearer authentication, 8h expiry), `google-auth-library`, `helmet`, `cors`, `express-rate-limit`
- **Mailing**: `nodemailer` (supports `console` and `smtp` transports)
- **Config**: `dotenv` with startup validation of required variables (`JWT_SECRET` min 32 chars)

---

## Directory Structure

```
server/
├── .env.example              # Environment variables template
├── package.json              # Express 5 dependencies and npm scripts
├── requests.http             # HTTP client collection for all endpoints
├── README.md                 # Setup, RBAC specification, and API reference
├── scripts/
│   ├── seed-admin.js         # Upserts active, approved, verified ADMIN into app_user
│   ├── seed-demo-accounts.js # Creates approved/pending organizers and players (CLI password)
│   ├── seed-demo.js          # Populates players, tournaments, rounds & games
│   ├── test-approval-flow.js # 41-case comprehensive verification for account approval flow
│   └── test-all-endpoints.js # 116-case table-driven RBAC & security regression suite
└── src/
    ├── app.js                # Express app factory with helmet, cors, and route registrations
    ├── server.js             # Server entry point with graceful shutdown
    ├── config/
    │   ├── db.js             # mysql2/promise connection pool configuration
    │   └── env.js            # Environment validation (JWT_SECRET min 32 chars fail-fast)
    ├── controllers/
    │   ├── adminController.js # Admin user approval, rejection, user CRUD, audit logs
    │   ├── authController.js  # Registration, email verify, login, Google sign-in, profile
    │   ├── dashboardController.js # Role-specific (GET /api/me/dashboard) and public dashboards
    │   ├── gameController.js  # Game results & stored procedure invocations
    │   ├── playerController.js # Player listing, privacy masking via v_organizer_player_access
    │   ├── roundController.js # Tournament round game pairings
    │   └── tournamentController.js # Tournament CRUD, standings, registrations, rounds
    ├── middleware/
    │   ├── authMiddleware.js     # authMiddleware, requireRole, requireApproved, requireTournamentAccess
    │   ├── errorHandler.js       # Central error handler mapping MySQL error codes (SIGNAL 1644 -> 400)
    │   ├── rateLimitMiddleware.js # Rate limiting for auth and login
    │   └── validateMiddleware.js # Zod request body validation
    ├── routes/
    │   ├── adminRoutes.js
    │   ├── authRoutes.js
    │   ├── dashboardRoutes.js
    │   ├── gameRoutes.js
    │   ├── playerRoutes.js
    │   ├── roundRoutes.js
    │   └── tournamentRoutes.js
    ├── services/
    │   └── mailService.js        # Email dispatching (console / smtp) with HTML templates
    └── utils/
        ├── auditLogger.js        # Structured audit logging utility
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
DB_NAME=chess_scratch
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

> **Database Safety Rule**: Always run test and maintenance scripts against `chess_scratch` (`DB_NAME=chess_scratch`). Production database `chess_db` is protected and processes abort immediately if connected to `chess_db`.

---

## Account Approval Flow

```
[ User Registers ]
       │
       ▼
app_user.status = 'PENDING_EMAIL'
app_user.approval_status = 'PENDING'
       │
       │ (User verifies email via token)
       ▼
app_user.status = 'ACTIVE'
app_user.approval_status = 'PENDING'
       │
       ├──► [ Can Log In & Explore Platform ]
       │    • Can view tournaments, standings, public dashboard, & player profiles (masked)
       │    • Can edit own profile & change password
       │    • Blocked from joining tournaments (PLAYER) or creating tournaments/managing games (ORGANIZER)
       │    • Actions return 403 Forbidden { code: 'NOT_APPROVED', message: 'Your account is waiting for admin approval' }
       │
       ▼ (Admin reviews in Admin Panel / v_pending_approvals)
 ┌─────────────┴─────────────┐
 │                           │
 ▼                           ▼
[ ADMIN APPROVES ]         [ ADMIN REJECTS ]
approval_status='APPROVED'  approval_status='REJECTED'
approved_by & approved_at   approval_note recorded
starting rating set (fresh) Email notification sent
Email notification sent     Status remains ACTIVE (can log in & read)
Actions fully unlocked      Actions remain blocked with 403 NOT_APPROVED
```

### Flow Details in Words

1. **Registration (`POST /api/auth/register`)**:
   - `PLAYER`: Requires `full_name`, `email`, `password` + `confirm_password`, `date_of_birth` (in the past, age >= 5), `gender` (`MALE`|`FEMALE`|`OTHER`|`UNDISCLOSED`), `experience_level` (`BEGINNER`|`INTERMEDIATE`|`ADVANCED`|`EXPERT`), `accept_terms`. Creates linked `player` row (rating 1200) and `app_user` in one transaction. Initial: `status = 'PENDING_EMAIL'`, `approval_status = 'PENDING'`. Phone stored in `app_user.phone`.
   - `ORGANIZER`: Requires `full_name`, `email`, `password` + `confirm_password`, `phone` (required), `organization` (required), `accept_terms`. Creates `app_user` with `status = 'PENDING_EMAIL'`, `approval_status = 'PENDING'`.
   - Sends verification email with a 32-byte hex token (SHA-256 stored in `auth_token`).

2. **Email Verification (`POST /api/auth/verify-email`)**:
   - Consumes token; sets `email_verified = 1` and `status = 'ACTIVE'`.
   - `approval_status` stays `'PENDING'`.
   - Note: Status `PENDING_APPROVAL` no longer exists (allowed `app_user.status`: `PENDING_EMAIL`, `ACTIVE`, `SUSPENDED`).

3. **Login & Exploration (`POST /api/auth/login`, `GET /api/auth/me`)**:
   - All `ACTIVE` users can log in regardless of approval status. Suspended / unverified accounts remain blocked.
   - Response contains `approval_status`, `approval_note`, and derived permissions object `{ can_explore, can_join_tournaments, can_create_tournaments, can_manage_players }`.
   - Unapproved users have `can_explore: true` and can view public tournament listings, standings, public dashboards, and update their own profile / change password.

4. **Google Sign-In Flow (`POST /api/auth/google` & `POST /api/auth/google/complete`)**:
   - Verification module `src/services/googleVerifier.js` verifies the ID token using `google-auth-library` (`audience = GOOGLE_CLIENT_ID`). Rejects with `401 INVALID_GOOGLE_TOKEN` if verification fails or `email_verified` is not true. If `GOOGLE_CLIENT_ID` is not set, routes answer `503 GOOGLE_DISABLED`.
   - **Rule**: A new Google user gets an account ONLY after supplying the required profile data. Nothing is written to the database before that.
   - **`POST /api/auth/google {id_token}`** (rate limited like login):
     - **a. Already Linked**: If `google_sub` is already linked, logs in immediately (blocked if `SUSPENDED`; same response shape as `/auth/login`: `token`, `user`, `permissions`).
     - **b. Existing Email Account**:
       - If verified (`email_verified = 1`): links `google_sub` and logs in with `linked: true` in response. Password hash, role, and approval status remain untouched.
       - If unverified password account: links `google_sub`, sets `password_hash = NULL`, sets `email_verified = 1` and `status = 'ACTIVE'`, and deletes outstanding verification tokens. Never alters existing `role` or `approval_status`. Logs in with `linked: true`.
       - Writes an `audit_log` entry for account linking.
     - **c. New Person**: Creates **NOTHING** in the database. Returns `200 { needs_registration: true, registration_token, prefill: { email, full_name } }`. The `registration_token` is a 15-minute JWT signed with `JWT_SECRET`, purpose `'google_signup'`, containing `sub`, `email`, and `name`.
   - **`POST /api/auth/google/complete`**:
     - Consumes `registration_token`, `role: PLAYER|ORGANIZER`, `username`, `full_name`, `country_code`, `accept_terms`, and role fields.
     - Verifies token purpose and expiry. Extracts email and sub **ONLY** from the token, strictly ignoring any body overrides.
     - Validates profile requirements (same as registration, no password): `PLAYER` requires `date_of_birth`, `gender`, `experience_level` (optional `phone`, `club`, `fide_id`); `ORGANIZER` requires `phone` and `organization`. Role `ADMIN` cannot be requested. Validates username format, reserved names, and uniqueness (`409 USERNAME_TAKEN`).
     - In **ONE transaction**, creates `app_user` (no `password_hash`, `google_sub` set, `email_verified = 1`, `status = 'ACTIVE'`, `approval_status = 'PENDING'`) and for `PLAYER` creates linked player row (`current_rating = 1200`). If email or google_sub was taken in the meantime, returns `409`.
     - Logs audit entries for registration and account linking. Returns login response shape (`token`, `user`, `permissions`).
   - **Accounts Without a Password**:
     - Password login returns generic `401 Invalid email or password`.
     - Forgot-password (`/api/auth/forgot-password` -> `/api/auth/reset-password`) allows setting a local password at any time.

5. **Approval Gate Middleware (`requireApproved`)**:
   - Guard placed on `POST /tournaments/:id/register-me` and on all ORGANIZER write operations (create/update/start/complete tournament, register or remove player, rounds, games, results).
   - Blocks unapproved or rejected users with `403 Forbidden` (`code: 'NOT_APPROVED'`).
   - Database triggers (`trg_tournament_bi`, `trg_registration_bi`) also enforce this at the database level. MySQL SIGNAL (1644 / SQLSTATE 45000) errors map to HTTP 400.

6. **Admin Decision (`/api/admin/users/*`)**:
   - `POST /api/admin/users/:id/approve`: Sets `approval_status = 'APPROVED'`, `approved_by`, `approved_at`. For a `PLAYER` with 0 games played, sets player `current_rating` to `starting_rating` (100..3500) or default by `experience_level` (`BEGINNER`: 1000, `INTERMEDIATE`: 1200, `ADVANCED`: 1500, `EXPERT`: 1800). If games already exist, `starting_rating` is ignored. Dispatches approval email and logs to `audit_log`.
   - `POST /api/admin/users/:id/reject`: Sets `approval_status = 'REJECTED'` and `approval_note`. Dispatches rejection email and logs to `audit_log`.

---

## RBAC Permission Matrix

| Action / Capability | ADMIN | ORGANIZER (Approved, Owner) | ORGANIZER (Approved, Other) | ORGANIZER (Unapproved / Rejected) | PLAYER (Approved) | PLAYER (Unapproved / Rejected) | Unauthenticated |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Log in & Explore Platform (`can_explore`) | ✅ | ✅ | ✅ | ✅ (Active) | ✅ | ✅ (Active) | ❌ (401) |
| Read Public Tournaments, Standings, Analytics | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ (401) |
| Read Player Profile Contact Details (Email, DOB, Phone) | ✅ (All) | ✅ (Enrolled in own tourney only) | ❌ (Masked) | ❌ (Masked) | Own Only (Others Masked) | Own Only (Others Masked) | ❌ (401) |
| Create Tournament (`POST /api/tournaments`) | ✅ | ✅ | ✅ | ❌ (403 NOT_APPROVED) | ❌ (403) | ❌ (403) | ❌ (401) |
| Edit Tournament / Change Status | ✅ | ✅ | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (401) |
| Register Player to Tournament (`POST /register`) | ✅ | ✅ | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (401) |
| Remove Player Registration (`DELETE /registrations/:id`) | ✅ (Upcoming) | ✅ (Upcoming only) | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (401) |
| Player Self-Registration (`register-me`) | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (403) | ✅ (Upcoming only) | ❌ (403 NOT_APPROVED) | ❌ (401) |
| Create Tournament Round (`POST /rounds`) | ✅ | ✅ | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (401) |
| Schedule Game Board (`POST /games`) | ✅ | ✅ | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (401) |
| Record Match Result (`CALL record_result`) | ✅ | ✅ | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (401) |
| Modify Completed Tournament | ✅ | ❌ (403 "Tournament completed") | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (401) |
| Create Walk-in Player (`POST /api/players`) | ✅ | ✅ | ✅ | ❌ (403 NOT_APPROVED) | ❌ (403) | ❌ (403) | ❌ (401) |
| Edit Walk-in Player (No Linked User) | ✅ | ✅ | ✅ | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (401) |
| Edit Player With Linked User Account | ✅ | ❌ (403) | ❌ (403) | ❌ (403) | ✅ (Own profile only) | ✅ (Own profile only) | ❌ (401) |
| Edit Rating Directly (`current_rating`) | ❌ (400) | ❌ (400) | ❌ (400) | ❌ (400) | ❌ (400) | ❌ (400) | ❌ (401) |
| Access Admin Endpoints (`/api/admin/*`) | ✅ | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (401) |
| Approve / Reject Users | ✅ | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (401) |
| Suspend / Reactivate Users | ✅ | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (401) |
| Suspend Own Account / Change Own Role | ❌ (400) | — | — | — | — | — | — |
| View Role-Specific Dashboard (`/api/me/dashboard`) | ✅ (Admin metrics) | ✅ (Organizer metrics) | ✅ (Organizer metrics) | ✅ (Unapproved metrics) | ✅ (Player metrics) | ✅ (Unapproved metrics) | ❌ (401) |

---

## Privacy & Data Masking Rules (`v_organizer_player_access`)

- **PLAYER**: Contact details (`email`, `phone`, `date_of_birth`) are returned **ONLY** on their own record. For all other players, sensitive fields are omitted or null.
- **ORGANIZER**: Contact details (`email`, `phone`, `date_of_birth`) are returned **ONLY** for players currently enrolled in tournaments created by that organizer (via view `v_organizer_player_access`). For players outside their tournaments, sensitive contact details are masked/omitted.
- **ADMIN**: Sees unmasked records across all endpoints.

---

## Route-by-Route Specification Table

| Route | Method | Allowed Roles / Approval | Description & Security Enforcement |
|---|:---:|---|---|
| `/health` | `GET` | Public | System health check and database status. |
| `/api/auth/register` | `POST` | Public | Discriminated union schema for `PLAYER` (validates dob, age >= 5, gender, experience_level, accept_terms) and `ORGANIZER` (validates phone, organization, accept_terms). Sends verification email. |
| `/api/auth/verify-email` | `POST` | Public | Verifies token, sets `status = 'ACTIVE'`, keeping `approval_status = 'PENDING'`. |
| `/api/auth/resend-verification` | `POST` | Public | Resends verification token (60-second cooldown per account). |
| `/api/auth/login` | `POST` | Public | Authenticates credentials; allows any `ACTIVE` user; returns JWT, `approval_status`, `approval_note`, and `permissions` object. 5 failed attempts locks account for 15 minutes. |
| `/api/auth/google` | `POST` | Public | Google OAuth2 ID token verification; account linking or returns 15m `registration_token` with prefill data. Answers 503 if disabled. |
| `/api/auth/google/complete` | `POST` | Public | Finalizes new Google registration with profile data; creates `app_user` (`PENDING`) and `player` (1200 rating). |
| `/api/auth/forgot-password` | `POST` | Public | Issues 1-hour single-use reset token via email. |
| `/api/auth/reset-password` | `POST` | Public | Consumes reset token and sets new password. |
| `/api/auth/me` | `GET` | Authenticated | Returns current authenticated user record with linked player chess profile and `permissions` object. |
| `/api/auth/me/profile` | `PUT` | Authenticated | Updates account details (`full_name`, `phone`, `organization`, `country`, `date_of_birth`, `gender`, `experience_level`, `club`, `fide_id`). Returns `profile_complete`. |
| `/api/auth/change-password` | `POST` | Authenticated | Changes password given valid current password. |
| `/api/me/dashboard` | `GET` | Authenticated | Returns customized dashboard payload according to role: `PLAYER`, `ORGANIZER`, or `ADMIN`. |
| `/api/dashboard` | `GET` | Any ACTIVE user | Global tournament, player, upset, and platform-wide metrics. |
| `/api/tournaments` | `GET` | Any ACTIVE user | Lists tournaments; appends `created_by`, `owner_name`, and boolean `can_manage`. |
| `/api/tournaments/:id` | `GET` | Any ACTIVE user | Returns tournament detail with player counts, rounds, `owner_name`, and `can_manage`. |
| `/api/tournaments/:id/registrations` | `GET` | Any ACTIVE user | Lists registrations; contact details masked per `v_organizer_player_access`. |
| `/api/tournaments/:id/rounds` | `GET` | Any ACTIVE user | Lists scheduled rounds for tournament. |
| `/api/tournaments/:id/standings` | `GET` | Any ACTIVE user | Returns tournament standings from `v_leaderboard`. |
| `/api/tournaments/:id/analytics` | `GET` | Any ACTIVE user | Returns match statistics and upset analytics. |
| `/api/tournaments/:id/predictions` | `GET` | Any ACTIVE user | Returns tournament performance predictions. |
| `/api/tournaments` | `POST` | `ADMIN`, Approved `ORGANIZER` | Enforced via `requireApproved`. Creates tournament; sets `created_by = req.user.user_id`. Unapproved organizer gets `403 NOT_APPROVED`. |
| `/api/tournaments/:id` | `PUT` | Creator `ORGANIZER`, `ADMIN` | Enforced via `requireApproved` and `requireTournamentAccess`. Creator or ADMIN only. If completed, non-admins get `403`. |
| `/api/tournaments/:id/register` | `POST` | Creator `ORGANIZER`, `ADMIN` | Enforced via `requireApproved` and `requireTournamentAccess`. Enrolls player to upcoming tournament. |
| `/api/tournaments/:id/register-me` | `POST` | Approved `PLAYER` only | Enforced via `requireRole('PLAYER')` and `requireApproved`. Unapproved player gets `403 NOT_APPROVED`. Upcoming tournaments only (`400`). |
| `/api/tournaments/:id/registrations/:playerId` | `DELETE` | Creator `ORGANIZER`, `ADMIN` | Enforced via `requireApproved`. Removes player registration. Allowed **only** while tournament status is `UPCOMING` (`400`). |
| `/api/tournaments/:id/rounds` | `POST` | Creator `ORGANIZER`, `ADMIN` | Enforced via `requireApproved`. Creates next round in ongoing tournament. |
| `/api/rounds/:id/games` | `GET` | Any ACTIVE user | Lists scheduled games in round. |
| `/api/rounds/:id/games` | `POST` | Creator `ORGANIZER`, `ADMIN` | Enforced via `requireApproved` and `requireTournamentAccess('round')`. Schedules game board. |
| `/api/games/:id/result` | `POST` | Creator `ORGANIZER`, `ADMIN` | Enforced via `requireApproved` and `requireTournamentAccess('game')`. Calls stored procedure `CALL record_result(?, ?)`. |
| `/api/players` | `GET` | Any ACTIVE user | Lists players with `can_edit`. Email/DOB/phone masked per `v_organizer_player_access`. |
| `/api/players/:id` | `GET` | Any ACTIVE user | Returns player profile. Sensitive fields masked per `v_organizer_player_access`. |
| `/api/players/:id/analytics` | `GET` | Any ACTIVE user | Returns player performance, rating history, and match records. |
| `/api/players` | `POST` | `ADMIN`, Approved `ORGANIZER` | Enforced via `requireApproved`. Creates walk-in player with default rating 1200. |
| `/api/players/:id` | `PUT` | `ADMIN`, Self (`PLAYER`), Unlinked (`ORGANIZER`) | Updates player profile. Direct rating edit blocked (`400`). Organizers cannot edit players with linked user accounts (`403`). |
| `/api/admin/overview` | `GET` | `ADMIN` only | Consolidated administrative dashboard statistics, system metrics, and recent activities. |
| `/api/admin/system/db-status` | `GET` | `ADMIN` only | Database connection and schema diagnostic facts (DB name, MySQL version, schema checks, row counts, newest records) without host, user, or password. Audit-logs nothing. |
| `/api/admin/users` | `GET` | `ADMIN` only | Lists users with filters: `role`, `approval_status`, `status`, `q`, `limit`, `offset`. Includes linked player chess profile. |
| `/api/admin/users/:id` | `GET` | `ADMIN` only | Returns user detail, linked player profile, and tournament count for organizers. |
| `/api/admin/users/:id` | `PUT` | `ADMIN` only | Updates user (`full_name`, `phone`, `organization`) and linked player (`name`, `country`, `date_of_birth`, `gender`, `experience_level`, `club`, `fide_id`). Cannot edit rating, role, email, password. |
| `/api/admin/users/:id/approve` | `POST` | `ADMIN` only | Approves user (`approval_status = 'APPROVED'`). For fresh players (0 games), sets `current_rating` to `starting_rating` (100..3500) or default by `experience_level`. Dispatches approval email. |
| `/api/admin/users/:id/reject` | `POST` | `ADMIN` only | Rejects user (`approval_status = 'REJECTED'`) with note. Dispatches rejection email. |
| `/api/admin/users/:id/suspend` | `POST` | `ADMIN` only | Suspends user. Self-suspension blocked (`400`). |
| `/api/admin/users/:id/reactivate` | `POST` | `ADMIN` only | Reactivates suspended user to `ACTIVE`. |
| `/api/admin/users/:id/role` | `POST` / `PUT` | `ADMIN` only | Changes user role. Self-role-change blocked (`400`). |

---

## Seeding & Verification Scripts

All testing and seeding scripts target `chess_scratch` and verify the database name before execution:

1. **Seed Admin User**:
   ```bash
   cd server
   DB_NAME=chess_scratch node scripts/seed-admin.js admin@chess.local AdminPass123! "Platform Administrator"
   ```

2. **Seed Demo Accounts**:
   Creates 1 approved organizer, 1 pending organizer, 1 approved player, and 1 pending player:
   ```bash
   cd server
   DB_NAME=chess_scratch node scripts/seed-demo-accounts.js DemoPassword123!
   ```

3. **Run Account Approval Flow Verification Suite (41 tests)**:
   ```bash
   cd server
   DB_NAME=chess_scratch node scripts/test-approval-flow.js
   ```

4. **Run Regression RBAC & Security Suite (129 tests)**:
   ```bash
   cd server
   DB_NAME=chess_scratch node scripts/test-all-endpoints.js
   ```

5. **Run Google Sign-In & Verification Suite (33 tests)**:
   ```bash
   cd server
   DB_NAME=chess_scratch node scripts/test-google-auth.js
   ```

6. **Database Connection & Diagnostic Check**:
   ```bash
   cd server
   node scripts/check-db-connection.js
   ```
