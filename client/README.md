# Chess Tournament & Analytics - Frontend Client

Modern React 19 single-page application built with Vite, Tailwind CSS, Recharts, react-router-dom, and Axios.

---

## Features

- **Dashboard**:
  - Top-10 rating horizontal bar chart
  - Win / Draw / Loss outcome distribution pie chart
  - Total upsets & key performance metric cards
  - Recent high-impact upsets table (&ge; 100 Elo rating gap)
  - Rating progression multi-line chart for the top 5 players
- **Players**:
  - Live searchable table (`?q=`)
  - Add Player modal (with optional initial rating 1200)
  - Edit Player modal (ratings are protected and immutable)
  - Direct profile links
- **Player Profile**:
  - Performance statistics cards (games played, win/draw/loss %, avg opponent rating, net rating change)
  - Detailed rating progression history line chart with 5-game moving average
  - Tournament history & standings table
- **Tournaments**:
  - Active tournaments grid with format & status badges
  - Create Tournament modal with format selection and dates validation
- **Tournament Detail Hub (Tabbed Interface)**:
  - **Standings**: Real-time tournament leaderboard from database view
  - **Rounds & Games**: Round cards, add next round, schedule games with registered player dropdowns, and "Record Result" controls (White / Draw / Black)
  - **Registrations**: Competitor list with entry rating snapshot & player registration dropdown
  - **Analytics**: Outcome distribution metrics, upset victories, and player rating delta table
- **Authentication & Security**:
  - Admin login with JWT stored in `localStorage`
  - Axios request interceptor attaches `Authorization: Bearer <token>`
  - Action buttons (Add, Edit, Schedule, Record Result) are strictly hidden when not authenticated
  - Toast notification system displaying backend API error messages

---

## Getting Started

### 1. Environment Setup
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default configuration:
```env
VITE_API_URL=http://localhost:5000/api
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Development Server
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

### 4. Build for Production
```bash
npm run build
```
Build output is generated in `dist/`.
