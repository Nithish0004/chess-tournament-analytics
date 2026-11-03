import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { ProtectedRoute } from './components/ProtectedRoute';

import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { AdminLogin } from './pages/AdminLogin';
import { Register } from './pages/Register';
import { VerifyEmail } from './pages/VerifyEmail';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { CompleteProfile } from './pages/CompleteProfile';
import { ApprovalBanner } from './components/ApprovalBanner';
import { Players } from './pages/Players';
import { PlayerProfile } from './pages/PlayerProfile';
import { Tournaments } from './pages/Tournaments';
import { TournamentDetail } from './pages/TournamentDetail';
import { RoundsMatches } from './pages/RoundsMatches';
import { Results } from './pages/Results';
import { Standings } from './pages/Standings';
import { Analytics } from './pages/Analytics';
import { Predictions } from './pages/Predictions';
import { Messages } from './pages/Messages';
import { Settings } from './pages/Settings';
import { AdminUsers } from './pages/AdminUsers';
import { AuditLog } from './pages/AuditLog';
import { Forbidden } from './pages/Forbidden';

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
  if (pathname === '/tournaments/new') {
    return {
      title: 'Create Tournament',
      subtitle: 'Configure new official championship or league fixture'
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
  if (pathname === '/messages') {
    return {
      title: 'Messages',
      subtitle: 'Direct communications, arbiter announcements and tournament channels'
    };
  }
  if (pathname === '/settings') {
    return {
      title: 'Settings',
      subtitle: 'Account details, security settings and visual preferences'
    };
  }
  if (pathname === '/admin/users') {
    return {
      title: 'User Management',
      subtitle: 'System user directory, role allocations, and account access control'
    };
  }
  if (pathname === '/admin/audit-log') {
    return {
      title: 'Audit Log',
      subtitle: 'System security audit trail, operational actions, and administrative activity'
    };
  }
  if (pathname === '/forbidden') {
    return {
      title: 'Access Restricted',
      subtitle: 'HTTP 403 Forbidden - Insufficient Permissions'
    };
  }
  return {
    title: 'Chess Magic',
    subtitle: 'Tournament Management & Performance Analytics'
  };
};

// Helper component to route /profile directly to player's personal profile
function ProfileRedirect() {
  const { user } = useAuth();
  if (user?.player_id) {
    return <Navigate to={`/players/${user.player_id}`} replace />;
  }
  return <Navigate to="/players" replace />;
}

function AppContent() {
  const location = useLocation();

  // If on authentication routes, render standalone split-screen without sidebar & topbar
  if (['/login', '/login/admin', '/admin/login', '/register', '/verify-email', '/forgot-password', '/reset-password', '/complete-profile'].includes(location.pathname)) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/login/admin" element={<AdminLogin />} />
        <Route path="/admin/login" element={<Navigate to="/login/admin" replace />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/complete-profile" element={<CompleteProfile />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  const { title, subtitle } = getPageMeta(location.pathname);

  return (
    <div className="min-h-screen bg-[#101010] text-[#F5F5F5] flex flex-col lg:flex-row">
      {/* 260px Fixed Sidebar on Desktop, Drawer on Mobile */}
      <Sidebar />

      {/* Main Viewport Container */}
      <div className="flex-1 lg:pl-[260px] min-w-0 flex flex-col min-h-screen">
        {/* Top Header Bar */}
        <TopBar title={title} subtitle={subtitle} />

        {/* Global Account Approval Banner */}
        <ApprovalBanner />

        {/* Page Content Viewport with Route Guards */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          <Routes>
            {/* Friendly 403 page */}
            <Route path="/forbidden" element={<Forbidden />} />

            {/* Admin-only routes */}
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminUsers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/audit-log"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AuditLog />
                </ProtectedRoute>
              }
            />

            {/* ADMIN + ORGANIZER only routes */}
            <Route
              path="/tournaments/new"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'ORGANIZER']}>
                  <Tournaments defaultOpenCreate={true} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/rounds"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'ORGANIZER']}>
                  <RoundsMatches />
                </ProtectedRoute>
              }
            />
            <Route
              path="/results"
              element={
                <ProtectedRoute allowedRoles={['ADMIN', 'ORGANIZER']}>
                  <Results />
                </ProtectedRoute>
              }
            />

            {/* Everyone logged in (ADMIN, ORGANIZER, PLAYER) */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tournaments"
              element={
                <ProtectedRoute>
                  <Tournaments />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tournaments/:id"
              element={
                <ProtectedRoute>
                  <TournamentDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/players"
              element={
                <ProtectedRoute>
                  <Players />
                </ProtectedRoute>
              }
            />
            <Route
              path="/players/:id"
              element={
                <ProtectedRoute>
                  <PlayerProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/standings"
              element={
                <ProtectedRoute>
                  <Standings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute>
                  <Analytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/predictions"
              element={
                <ProtectedRoute>
                  <Predictions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/messages"
              element={
                <ProtectedRoute>
                  <Messages />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfileRedirect />
                </ProtectedRoute>
              }
            />
            <Route
              path="/complete-profile"
              element={
                <ProtectedRoute>
                  <CompleteProfile />
                </ProtectedRoute>
              }
            />

            {/* Fallback */}
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
