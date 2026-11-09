# Chess Magic Demo Dataset Guide

This document describes how to seed, verify, and reset the complete demo dataset for Chess Magic, provides a reference table of all demo credentials, and outlines a 5-minute interactive presentation script.

---

## 1. Quick Start Commands

Run these commands inside the `server/` directory:

```bash
# Seed the complete demo dataset (idempotent; safe to run multiple times)
npm run seed:demo

# Verify database integrity, tournament statuses, zero-sum Elo, and API endpoints
npm run verify:demo

# Clean up ONLY demo data (foreign-key safe, never drops tables or touches real accounts)
npm run reset:demo
```

> **Database Safety**: All demo users use emails ending in `@demo.chessmagic.test`. The scripts strictly target demo records and will never alter or delete existing user accounts (`admin2006`, etc.) or production data.
>
> **Schema Note (`sql/05_demo_support.sql`)**: Tournament creator ownership (`created_by INT NULL` referencing `app_user.user_id`) is already natively implemented in the schema (`04_auth.sql`) and fully enforced by `authMiddleware.js`. Therefore, no additional or risky migration was needed.

---

## 2. Demo Credentials Reference

All demo passwords use simple alphanumeric characters only (letters and digits).

### 2.1 Administrator

| Role | Username | Password | Email | Full Name | Country |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ADMIN** | `admin_demo` | `AdminDemo123` | `admin_demo@demo.chessmagic.test` | Demo Administrator | India (IN) |

### 2.2 Organizers

| Role | Username | Password | Email | Organization | Phone |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ORGANIZER** | `org_rvce` | `OrgDemo123` | `org_rvce@demo.chessmagic.test` | RV College of Engineering | +919876543210 |
| **ORGANIZER** | `org_mysuru` | `OrgDemo123` | `org_mysuru@demo.chessmagic.test` | Mysuru Chess Academy | +919876543211 |
| **ORGANIZER** | `org_blitz` | `OrgDemo123` | `org_blitz@demo.chessmagic.test` | Bengaluru Blitz Club | +919876543212 |

### 2.3 Players (20 Accounts)

All player accounts share the password: **`PlayerDemo123`**

| # | Username | Name | Country | Starting Rating | Level | Club | FIDE ID |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `aditya_v` | Aditya Varma *(Top Seed)* | India (IN) | 2020 | EXPERT | Bangalore Chess Academy | 5001001 |
| 2 | `magnus_e` | Erik Lindqvist *(Foreign 1)* | Norway (NO) | 1910 | EXPERT | Oslo Schakselskap | 1509001 |
| 3 | `pranav_r` | Pranav Rao | India (IN) | 1840 | ADVANCED | Bangalore Chess Club | 5001002 |
| 4 | `elena_r` | Elena Rostova *(Foreign 2)* | USA (US) | 1820 | ADVANCED | Marshall Chess Club | 2029001 |
| 5 | `arjun_m` | Arjun Mehta *(Close Pair 1A)* | India (IN) | 1755 | ADVANCED | Karnataka Chess Academy | 5001003 |
| 6 | `karthik_r` | Karthik Ramaswamy *(Close Pair 1B)* | India (IN) | 1750 | ADVANCED | Mysuru Chess Club | 5001004 |
| 7 | `timur_k` | Timur Karimov *(Foreign 3)* | Uzbekistan (UZ) | 1720 | ADVANCED | Tashkent Chess Academy | 1429001 |
| 8 | `gayathri_k` | Gayathri Krishna | India (IN) | 1680 | ADVANCED | WACA Masters | 5001005 |
| 9 | `lucas_m` | Lucas Meyer *(Foreign 4)* | Germany (DE) | 1640 | INTERMEDIATE | Schachfreunde Berlin | 1299001 |
| 10 | `nithish_s` | Nithish Sharma | India (IN) | 1610 | INTERMEDIATE | RVCE Chess Club | 5001006 |
| 11 | `ananya_d` | Ananya Deshmukh | India (IN) | 1560 | INTERMEDIATE | Mumbai Chess Academy | 5001007 |
| 12 | `siddharth_n` | Siddharth Nair | India (IN) | 1510 | INTERMEDIATE | Kerala Chess Guild | 5001008 |
| 13 | `varun_k` | Varun Kulkarni | India (IN) | 1480 | INTERMEDIATE | Hubballi Chess Trust | 5001009 |
| 14 | `rohan_p` | Rohan Patel *(Close Pair 2A)* | India (IN) | 1425 | INTERMEDIATE | Gujarat Chess Guild | 5001010 |
| 15 | `vikram_j` | Vikram Joshi *(Close Pair 2B)* | India (IN) | 1420 | INTERMEDIATE | Pune Chess Circle | 5001011 |
| 16 | `meera_s` | Meera Sundaram | India (IN) | 1390 | INTERMEDIATE | Chennai Chess League | 5001012 |
| 17 | `divya_b` | Divya Balaji | India (IN) | 1320 | BEGINNER | RVCE Chess Club | 5001013 |
| 18 | `rahul_t` | Rahul Tiwari | India (IN) | 1280 | BEGINNER | Delhi Chess Guild | 5001014 |
| 19 | `chirag_a` | Chirag Agarwal | India (IN) | 1250 | BEGINNER | Jaipur Chess Knights | 5001015 |
| 20 | `tanvi_m` | Tanvi Mishra | India (IN) | 1210 | BEGINNER | Bhopal Chess Club | 5001016 |

---

## 3. Demo Tournaments Architecture

1. **"Bengaluru Blitz"**
   - **Status**: `COMPLETED`
   - **Organizer**: `org_blitz`
   - **Format**: Round Robin (8 players, 7 rounds, 28 games recorded).
   - **Start Date**: ~25 days ago.
   - **Features**: Complete tournament history, final standings table, 2+ major upset victories.
2. **"Mysuru Rapid Cup"**
   - **Status**: `ONGOING`
   - **Organizer**: `org_mysuru`
   - **Format**: Round Robin (8 players, 7 planned rounds).
   - **Features**: Rounds 1-3 fully recorded (12 games); Round 4 has 4 games in `SCHEDULED` status ready for live recording during the presentation; Rounds 5-7 ungenerated.
3. **"RVCE Open 2026"**
   - **Status**: `UPCOMING`
   - **Organizer**: `org_rvce`
   - **Format**: Swiss (12 registered players).
   - **Start Date**: In 10 days. Registration deadline in future.
   - **Features**: 0 rounds created so the presenter can demonstrate starting the tournament or creating rounds live. Includes 12 pre-seeded ML score predictions (`model_version: 'demo'`).
4. **"Karnataka Classic"**
   - **Status**: `COMPLETED`
   - **Organizer**: `org_rvce`
   - **Format**: Round Robin (6 players, 5 rounds, 15 games recorded).
   - **Features**: Shorter completed tournament demonstrating historical data and additional upset cards.

---

## 4. 5-Minute Demo Presentation Script

### Minute 1: Public Landing Page & Dashboard
- Navigate to the application home / dashboard.
- Point out the active tournaments overview: 2 completed tournaments, 1 ongoing, and 1 upcoming.
- Point out the country flags in the player list (India, Norway, USA, Germany, Uzbekistan).
- Show the **Upsets & Highlights** card (lower-rated players defeating opponents 100+ points above them).

### Minute 2: Organizer Portal & Tournament Management
- Sign in as Organizer: **`org_mysuru`** / **`OrgDemo123`**.
- Open the **"Mysuru Rapid Cup"** tournament page:
  - Show the status is `ONGOING`.
  - Review Rounds 1 to 3: all games are completed with results (`WHITE`, `BLACK`, `DRAW`).
  - Show the live standings table calculated through round 3.

### Minute 3: Live Game Result Recording & Atomic Elo Update
- In **Mysuru Rapid Cup**, navigate to **Round 4**:
  - Show the 4 pending scheduled games.
  - On Board 1, record a result: select **White** or **Black** and submit.
  - Show immediate real-time feedback:
    1. The game status transitions from `SCHEDULED` to `FINISHED`.
    2. Rating changes ($\pm \Delta$) are calculated atomically via `record_result` stored procedure.
    3. Standings immediately update with points, wins, and recalculated tiebreak ranks.

### Minute 4: Role-Based Access Control (RBAC)
- Demonstrate RBAC security:
  - As `org_mysuru`, attempt to edit "Bengaluru Blitz" (created by `org_blitz`) $\rightarrow$ action is disallowed.
  - Sign out.

### Minute 5: Player Perspective & ML Predictions
- Sign in as a Player: **`nithish_s`** / **`PlayerDemo123`**.
- Open the Player Profile:
  - Show current rating, win/draw/loss record, and rating progression line chart.
  - View the list of tournaments entered.
- Open **"RVCE Open 2026"** (UPCOMING tournament):
  - View the 12 registered competitors.
  - Open the **Predictions** tab to view the pre-tournament predicted scores and rank projections.
- Conclude demo. Run `npm run seed:demo` after the session to restore pristine demo state.
