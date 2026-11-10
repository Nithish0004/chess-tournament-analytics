# Chess Tournament Management & Analytics

Express REST API and React frontend for the Chess Tournament Management and Analytics system. Built with Node.js ES modules, MySQL 8.0, and React.

---

## Account Approval Flow

The platform enforces a two-stage verification and approval workflow for user accounts:

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

### Flow Diagram & Stage Details in Words

1. **Stage 1: Registration (`POST /api/auth/register`)**
   - **PLAYER**: Requires `full_name`, `email`, `password` + `confirm_password`, `date_of_birth` (required, in the past, age >= 5 years), `gender` (`MALE`|`FEMALE`|`OTHER`|`UNDISCLOSED`), `experience_level` (`BEGINNER`|`INTERMEDIATE`|`ADVANCED`|`EXPERT`), and `accept_terms`. Optional: `phone`, `country`, `club`, `fide_id`.
     - In a single database transaction, creates the linked `player` row (starting rating 1200) and the `app_user` row.
     - `phone` is stored in `app_user.phone`; chess profile attributes live on `player`.
     - Initial state: `status = 'PENDING_EMAIL'`, `approval_status = 'PENDING'`.
   - **ORGANIZER**: Requires `full_name`, `email`, `password` + `confirm_password`, `phone` (required), `organization` (required), `accept_terms`. Optional: `country`.
     - Creates the `app_user` row with `phone` and `organization`.
     - Initial state: `status = 'PENDING_EMAIL'`, `approval_status = 'PENDING'`.
   - **Token & Verification**: Generates a cryptographically secure 32-byte hex token, stores its SHA-256 hash in `auth_token` (24-hour expiry), and sends an email verification link. Returns a generic 200 response to prevent email enumeration.

2. **Stage 2: Email Verification (`POST /api/auth/verify-email`)**
   - Consumes the single-use verification token.
   - Sets `app_user.email_verified = 1` and transitions `app_user.status = 'ACTIVE'`.
   - `app_user.approval_status` remains `'PENDING'` for both PLAYER and ORGANIZER.
   - *Note*: The legacy status `PENDING_APPROVAL` no longer exists. Allowed `app_user.status` values: `PENDING_EMAIL`, `ACTIVE`, `SUSPENDED`.

3. **Stage 3: Exploration & Login (`POST /api/auth/login`, `GET /api/auth/me`)**
   - Every `status = 'ACTIVE'` user can log in regardless of `approval_status`. Suspended or unverified accounts remain blocked.
   - Returns a JWT bearer token, user info including `approval_status` and `approval_note`, and a primary permissions object:
     ```json
     {
       "can_explore": true,
       "can_join_tournaments": false,
       "can_create_tournaments": false,
       "can_manage_players": false
     }
     ```
   - Unapproved users have `can_explore: true` and can view tournaments, standings, leaderboards, and analytics.

4. **Stage 4: Google OAuth Sign-In Flow (`POST /api/auth/google` & `POST /api/auth/google/complete`)**
   - Verification module `src/services/googleVerifier.js` verifies the ID token using `google-auth-library` (`audience = GOOGLE_CLIENT_ID`). Rejects with `401 INVALID_GOOGLE_TOKEN` if verification fails or `email_verified` is not true. If `GOOGLE_CLIENT_ID` is not set, answers `503 GOOGLE_DISABLED`.
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

5. **Stage 5: Approval Gate (`requireApproved` Middleware & Triggers)**
   - Protects `POST /api/tournaments/:id/register-me` (PLAYER self-registration).
   - Protects all ORGANIZER write routes: tournament create, update, start, complete, register player, remove registration, round creation, game scheduling, result recording.
   - `ADMIN` always passes.
   - Unapproved (`PENDING`) or `REJECTED` users receive `403 Forbidden`:
     ```json
     {
       "error": "Your account is waiting for admin approval",
       "message": "Your account is waiting for admin approval",
       "code": "NOT_APPROVED"
     }
     ```
   - Database triggers (`trg_tournament_bi`, `trg_registration_bi`) provide defense-in-depth: unapproved players cannot be inserted into `registration`, and unapproved organizers cannot be inserted into `tournament`. Trigger errors (SIGNAL SQLSTATE 45000 / errno 1644) are mapped to HTTP 400.

6. **Stage 6: Admin Review & Actions (`/api/admin/users/*`)**
   - Admin views users and pending queue via `GET /api/admin/users` or `v_pending_approvals`.
   - **Approve (`POST /api/admin/users/:id/approve`)**:
     - Sets `approval_status = 'APPROVED'`, `approved_by = req.user.user_id`, `approved_at = NOW()`.
     - **Starting Rating Logic**: For a PLAYER with no recorded games in `rating_history`, applies provided `starting_rating` (100..3500) or defaults based on `experience_level`:
       - `BEGINNER`: 1000
       - `INTERMEDIATE`: 1200
       - `ADVANCED`: 1500
       - `EXPERT`: 1800
     - If the player already has recorded games/results, `starting_rating` is ignored.
     - Dispatches account approval email and logs action to `audit_log`.
   - **Reject (`POST /api/admin/users/:id/reject`)**:
     - Sets `approval_status = 'REJECTED'` and `approval_note = note`.
     - Dispatches account rejection email with the explanation note and logs action to `audit_log`.
   - **Account Management**: Supports user edit (`PUT /api/admin/users/:id`), suspend, reactivate, and role change. Admin cannot edit rating, email, password, or role via PUT; direct rating changes remain blocked.

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

To protect player privacy:
- **PLAYER**: Sees contact details (`email`, `phone`, `date_of_birth`) **ONLY** on their own player profile. For all other players, these fields are omitted or set to `null`.
- **ORGANIZER**: Sees sensitive contact details (`email`, `phone`, `date_of_birth`) **ONLY** for players currently enrolled in a tournament created by that organizer (via `v_organizer_player_access`). For players outside their tournaments, sensitive contact details are masked/omitted.
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
