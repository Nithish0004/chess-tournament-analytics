import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Sidebar } from './components/Sidebar';

import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { Players } from './pages/Players';
import { PlayerProfile } from './pages/PlayerProfile';
import { Tournaments } from './pages/Tournaments';
import { TournamentDetail } from './pages/TournamentDetail';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col lg:flex-row">
            {/* Sidebar navigation */}
            <Sidebar />

            {/* Main content viewport */}
            <main className="flex-1 lg:pl-64 min-w-0">
              <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-10">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/players" element={<Players />} />
                  <Route path="/players/:id" element={<PlayerProfile />} />
                  <Route path="/tournaments" element={<Tournaments />} />
                  <Route path="/tournaments/:id" element={<TournamentDetail />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </div>
            </main>
          </div>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
