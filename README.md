# Chess Tournament Management & Analytics

Express REST API and React frontend for the Chess Tournament Management and Analytics system. Built with Node.js ES modules, MySQL 8.0, and React.

---

## Role-Based Access Control (RBAC) Specification

Role-based access control is enforced **strictly on the server** across every route in `/server`. The client UI is purely a convenience layer.

### Core Permission Rules

1. **Dashboard, Tournaments, Standings, Analytics, Predictions**: Any user with `status = 'ACTIVE'` may read these endpoints.
2. **Player Privacy & Masking (`GET /api/players`, `GET /api/players/:id`)**:
   - `PLAYER`: Receives other players **WITHOUT** `email` and `date_of_birth` (omitted from the JSON payload). Only their own player profile contains full details.
   - `ADMIN` and `ORGANIZER`: See full player records including `email` and `date_of_birth`.
   - Every returned player record contains a calculated boolean `can_edit`.
3. **Tournament Creation (`POST /api/tournaments`)**:
   - Allowed for `ADMIN` and `ORGANIZER`.
   - Sets `tournament.created_by = req.user.user_id` server-side (body cannot override).
   - Every tournament object returned by `GET /api/tournaments` and `GET /api/tournaments/:id` includes `created_by`, `owner_name`, and `can_manage`.
4. **Tournament Management (Edit, Status, Player Registration, Rounds, Games, Results)**:
   - `ADMIN`: Allowed on any tournament, even when `status = 'COMPLETED'`.
   - `ORGANIZER`: Allowed **only** where `created_by = req.user.user_id`. Forbidden on tournaments created by other organizers (`403 Forbidden`).
   - If `status = 'COMPLETED'`: Non-admins are blocked from changes (`403 "Tournament is completed"`).
   - `PLAYER`: Never allowed to manage tournaments (`403 Forbidden`).
5. **Self-Registration (`POST /api/tournaments/:id/register-me`)**:
   - Allowed **only** for role `PLAYER`.
   - Tournament must be `UPCOMING` (otherwise `400 "Registration is only open for UPCOMING tournaments"`).
   - `player_id` is extracted strictly from the authenticated token session (`req.user.player_id`).
6. **Player Creation (`POST /api/players`)**:
   - Walk-in players without user accounts may be created by `ADMIN` and `ORGANIZER`.
   - `PLAYER` is blocked (`403 Forbidden`).
7. **Player Profile Updates (`PUT /api/players/:id`)**:
   - `ADMIN`: May update any player.
   - `PLAYER`: May update **only** their own player profile (`Number(id) === req.user.player_id`).
   - `ORGANIZER`: May update **only** walk-in players with **NO linked user account** (`app_user.player_id IS NULL`). If the player has a linked account, returns `403`.
   - Direct rating updates are forbidden for everyone: passing `current_rating` in the body returns `400 "Rating cannot be edited directly"`.
8. **Rating Immutability**:
   - Nobody can modify a player rating directly. Rating adjustments occur solely via the database stored procedure `CALL record_result(p_game_id, p_outcome)` upon completing a scheduled game.
9. **Admin Self-Protection (`/api/admin/*`)**:
   - Only `ADMIN` role can access `/api/admin/*`.
   - An administrator cannot suspend themselves (`400 "An admin cannot suspend themselves"`).
   - An administrator cannot change their own role (`400 "An admin cannot change their own role"`).
10. **Session Permissions Payload**:
    - Both `POST /api/auth/login` and `GET /api/auth/me` return a structured `permissions` object detailing the user's role capabilities.

---

## RBAC Permission Matrix

| Action / Capability | ADMIN | ORGANIZER (Owner) | ORGANIZER (Other) | PLAYER | Unauthenticated |
|---|:---:|:---:|:---:|:---:|:---:|
| Read Dashboard, Tournaments, Standings, Analytics | ✅ | ✅ | ✅ | ✅ | ❌ (401) |
| Read Full Player Profile (Email & DOB) | ✅ | ✅ | ✅ | Own Only (Others Masked) | ❌ (401) |
| Create Tournament | ✅ | ✅ | ✅ | ❌ (403) | ❌ (401) |
| Edit Tournament Details / Status | ✅ | ✅ | ❌ (403) | ❌ (403) | ❌ (401) |
| Register Player to Tournament | ✅ | ✅ | ❌ (403) | ❌ (403) | ❌ (401) |
| Player Self-Registration (`register-me`) | ❌ (403) | ❌ (403) | ❌ (403) | ✅ (Upcoming only) | ❌ (401) |
| Create Tournament Round | ✅ | ✅ | ❌ (403) | ❌ (403) | ❌ (401) |
| Create Round Game Matchup | ✅ | ✅ | ❌ (403) | ❌ (403) | ❌ (401) |
| Record Match Result (`record_result`) | ✅ | ✅ | ❌ (403) | ❌ (403) | ❌ (401) |
| Modify Completed Tournament (Edits/Rounds/Games/Results) | ✅ | ❌ (403 "Tournament is completed") | ❌ (403) | ❌ (403) | ❌ (401) |
| Create Walk-in Player | ✅ | ✅ | ✅ | ❌ (403) | ❌ (401) |
| Edit Walk-in Player (No Linked Account) | ✅ | ✅ | ✅ | ❌ (403) | ❌ (401) |
| Edit Player With Linked Account | ✅ | ❌ (403) | ❌ (403) | ✅ (Own profile only) | ❌ (401) |
| Edit Rating Directly (`current_rating`) | ❌ (400) | ❌ (400) | ❌ (400) | ❌ (400) | ❌ (401) |
| Access Admin Panel & List Users | ✅ | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (401) |
| Approve Organizer Account | ✅ | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (401) |
| Suspend User / Reactivate User | ✅ | ❌ (403) | ❌ (403) | ❌ (403) | ❌ (401) |
| Suspend Own Account | ❌ (400) | — | — | — | — |
| Change Own Role | ❌ (400) | — | — | — | — |

---

## Route-by-Route Specification Table

| Route | Method | Allowed Roles | Enforcement Rule & Behavior |
|---|:---:|---|---|
| `/health` | `GET` | Public | Always accessible; returns API status and current timestamp. |
| `/api/auth/register` | `POST` | Public | Register `PLAYER` or `ORGANIZER` account (ADMIN prohibited). Sends verification email. |
| `/api/auth/verify-email` | `POST` | Public | Verifies email token (PLAYER $\rightarrow$ `ACTIVE`, ORGANIZER $\rightarrow$ `PENDING_APPROVAL`). |
| `/api/auth/resend-verification` | `POST` | Public | Resends verification token with 60-second account cooldown. |
| `/api/auth/login` | `POST` | Public | Authenticates credentials; returns 8h JWT, user profile, and `permissions` object. 5 failed attempts locks account for 15 minutes (`429 LOCKED`). |
| `/api/auth/forgot-password` | `POST` | Public | Sends single-use 1-hour password reset token to user email. |
| `/api/auth/reset-password` | `POST` | Public | Resets password with valid reset token and clears lockout. |
| `/api/auth/me` | `GET` | Authenticated | Returns current authenticated user record with linked `player` profile and `permissions` object. |
| `/api/auth/me/profile` | `PUT` | Authenticated | Updates current user account details (`full_name`, `phone`, `country`, `date_of_birth`, `organization`). |
| `/api/auth/change-password` | `POST` | Authenticated | Updates current user password given valid current password. |
| `/api/dashboard` | `GET` | Any ACTIVE user | Aggregates global tournament, player, upset, and recent activity metrics. |
| `/api/tournaments` | `GET` | Any ACTIVE user | Lists tournaments. Appends `created_by`, `owner_name`, and boolean `can_manage`. |
| `/api/tournaments/:id` | `GET` | Any ACTIVE user | Returns tournament by ID with player/round counts, `owner_name`, and `can_manage`. |
| `/api/tournaments/:id/registrations` | `GET` | Any ACTIVE user | Lists registered players for tournament. |
| `/api/tournaments/:id/rounds` | `GET` | Any ACTIVE user | Lists rounds scheduled for tournament. |
| `/api/tournaments/:id/standings` | `GET` | Any ACTIVE user | Returns leaderboard standings from `v_leaderboard`. |
| `/api/tournaments/:id/analytics` | `GET` | Any ACTIVE user | Returns match statistics, upsets from `v_upsets`, and player rating changes. |
| `/api/tournaments/:id/predictions` | `GET` | Any ACTIVE user | Returns machine-learning performance predictions. |
| `/api/tournaments` | `POST` | `ADMIN`, `ORGANIZER` | Creates new tournament. `created_by` is set server-side to `req.user.user_id`. `PLAYER` returns `403`. |
| `/api/tournaments/:id` | `PUT` | Creator `ORGANIZER`, `ADMIN` | Enforced via `requireTournamentAccess('tournament')`. Creator or ADMIN only. If `COMPLETED`, non-admin receives `403 "Tournament is completed"`. Other organizers and players receive `403`. |
| `/api/tournaments/:id/register` | `POST` | Creator `ORGANIZER`, `ADMIN` | Enforced via `requireTournamentAccess('tournament')`. Registers player to tournament. Blocked with `403 "Tournament is completed"` if completed. |
| `/api/tournaments/:id/register-me` | `POST` | `PLAYER` only | Enforced via `requireRole('PLAYER')`. Self-registers caller using `req.user.player_id`. Tournament must be `UPCOMING` (`400`). Admin and Organizers receive `403`. |
| `/api/tournaments/:id/rounds` | `POST` | Creator `ORGANIZER`, `ADMIN` | Enforced via `requireTournamentAccess('tournament')`. Creates next round. Blocked with `403 "Tournament is completed"` if completed. |
| `/api/rounds/:id/games` | `GET` | Any ACTIVE user | Lists scheduled and played games in round. |
| `/api/rounds/:id/games` | `POST` | Creator `ORGANIZER`, `ADMIN` | Enforced via `requireTournamentAccess('round')`. Schedules game board. Blocked with `403 "Tournament is completed"` if completed. |
| `/api/games/recent` | `GET` | Any ACTIVE user | Returns 10 most recent game results. |
| `/api/games/:id/result` | `POST` | Creator `ORGANIZER`, `ADMIN` | Enforced via `requireTournamentAccess('game')`. Calls stored procedure `CALL record_result(?, ?)`. Blocked with `403 "Tournament is completed"` if completed. |
| `/api/players` | `GET` | Any ACTIVE user | Lists players. Appends `can_edit`. For `PLAYER`, other players omit `email` and `date_of_birth`. `ADMIN` and `ORGANIZER` see all fields. |
| `/api/players/:id` | `GET` | Any ACTIVE user | Returns player profile. Appends `can_edit`. For `PLAYER`, other player record omits `email` and `date_of_birth`. `ADMIN` and `ORGANIZER` see all fields. |
| `/api/players/:id/analytics` | `GET` | Any ACTIVE user | Returns performance, progression, and match history. Player profile conforms to masking rules. |
| `/api/players` | `POST` | `ADMIN`, `ORGANIZER` | Enforced via `requireRole('ORGANIZER', 'ADMIN')`. Creates walk-in player with starting rating. `PLAYER` receives `403`. |
| `/api/players/:id` | `PUT` | `ADMIN`, Self (`PLAYER`), Unlinked (`ORGANIZER`) | Enforced via `checkNoDirectRatingEdit` and `requireSelfOrAdmin`. If `current_rating` provided, returns `400 "Rating cannot be edited directly"`. ADMIN can edit any player; PLAYER can only edit own profile (`id == player_id`); ORGANIZER can only edit walk-in players with no linked user account (linked account returns `403`). |
| `/api/admin/users` | `GET` | `ADMIN` only | Enforced via `requireRole('ADMIN')`. Lists and filters registered system users. |
| `/api/admin/users/:id/approve` | `POST` | `ADMIN` only | Approves pending organizer account (`PENDING_APPROVAL` $\rightarrow$ `ACTIVE`) and dispatches notification email. |
| `/api/admin/users/:id/suspend` | `POST` | `ADMIN` only | Suspends user. Self-suspension blocked (`400 "An admin cannot suspend themselves"`). |
| `/api/admin/users/:id/reactivate` | `POST` | `ADMIN` only | Reactivates suspended user to `ACTIVE`. |
| `/api/admin/users/:id/role` | `PUT` / `PATCH` / `POST` | `ADMIN` only | Changes user role (`ADMIN`, `ORGANIZER`, `PLAYER`). Self-role-change blocked (`400 "An admin cannot change their own role"`). |

---

## Running Verification Tests

```bash
cd server
node scripts/test-all-endpoints.js
```
