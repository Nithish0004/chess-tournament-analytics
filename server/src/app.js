import express from 'express';
import cors from 'cors';

import authRoutes from './routes/authRoutes.js';
import playerRoutes from './routes/playerRoutes.js';
import tournamentRoutes from './routes/tournamentRoutes.js';
import roundRoutes from './routes/roundRoutes.js';
import gameRoutes from './routes/gameRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

export const createApp = () => {
  const app = express();

  // Global Middleware
  app.use(cors());
  app.use(express.json());

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/players', playerRoutes);
  app.use('/api/tournaments', tournamentRoutes);
  app.use('/api/rounds', roundRoutes);
  app.use('/api/games', gameRoutes);
  app.use('/api/dashboard', dashboardRoutes);

  // 404 handler for undefined routes
  app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });

  // Central Error Handler
  app.use(errorHandler);

  return app;
};

export default createApp;
