import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';

import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { Players } from './pages/Players';
import { PlayerProfile } from './pages/PlayerProfile';
import { Tournaments } from './pages/Tournaments';
import { TournamentDetail } from './pages/TournamentDetail';
import { RoundsMatches } from './pages/RoundsMatches';
import { Results } from './pages/Results';
import { Standings } from './pages/Standings';
import { Analytics } from './pages/Analytics';
import { Predictions } from './pages/Predictions';

const getPageMeta = (pathname) => {
  if (pathname === '/') {
    return {
      title: 'Dashboard',
      subtitle: 'Tournament analytics, active fixtures and performance metrics'
    };
  }
  if (pathname === '/tournaments') {
    return {
      title: 'Tournaments',
      subtitle: 'Official championships, round-robin leagues, and knockout fixtures'
    };
  }
  if (pathname.startsWith('/tournaments/')) {
    return {
      title: 'Tournament Details',
      subtitle: 'Pairings, standings, live results and statistical projections'
    };
  }
  if (pathname === '/players') {
    return {
      title: 'Players Directory',
      subtitle: 'Registered competitors, Elo ratings, and performance profiles'
    };
  }
  if (pathname.startsWith('/players/')) {
    return {
      title: 'Player Profile',
      subtitle: 'Career statistics, rating progression, and tournament history'
    };
  }
  if (pathname === '/rounds') {
    return {
      title: 'Rounds & Matches',
      subtitle: 'Tournament fixtures, scheduled rounds, and board pairings'
    };
  }
  if (pathname === '/results') {
    return {
      title: 'Enter Game Result',
      subtitle: 'Record official outcomes, preview Elo rating changes, and check results'
    };
  }
  if (pathname === '/standings') {
    return {
      title: 'Tournament Standings',
      subtitle: 'Official leaderboard rankings, match records, and accumulated points'
    };
  }
  if (pathname === '/analytics') {
    return {
      title: 'Player Analytics',
      subtitle: 'Competitor rating trajectories, win distribution, and opponent strength metrics'
    };
  }
  if (pathname === '/predictions') {
    return {
      title: 'Tournament Predictions',
      subtitle: 'Machine learning forecasts, expected points, and statistical outcomes'
    };
  }
  return {
    title: 'ChessTourn',
    subtitle: 'Tournament Management & Analytics'
  };
};

function AppContent() {
  const location = useLocation();

  // If on login route, render standalone split-screen without sidebar & topbar
  if (location.pathname === '/login') {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  const { title, subtitle } = getPageMeta(location.pathname);

  return (
    <div className="min-h-screen bg-[#F4F7FB] text-slate-900 flex flex-col lg:flex-row">
      {/* 260px Fixed Sidebar on Desktop, Drawer on Mobile */}
      <Sidebar />

      {/* Main Viewport Container */}
      <div className="flex-1 lg:pl-[260px] min-w-0 flex flex-col min-h-screen">
        {/* Top Header Bar */}
        <TopBar title={title} subtitle={subtitle} />

        {/* Page Content Viewport */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/tournaments" element={<Tournaments />} />
            <Route path="/tournaments/:id" element={<TournamentDetail />} />
            <Route path="/players" element={<Players />} />
            <Route path="/players/:id" element={<PlayerProfile />} />
            <Route path="/rounds" element={<RoundsMatches />} />
            <Route path="/results" element={<Results />} />
            <Route path="/standings" element={<Standings />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/predictions" element={<Predictions />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
