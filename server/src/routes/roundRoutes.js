import { Router } from 'express';
import {
  createGame,
  getGames,
  createGameSchema
} from '../controllers/roundController.js';
import { authMiddleware, requireRole } from '../middleware/authMiddleware.js';
import { validateBody } from '../middleware/validateMiddleware.js';

const router = Router();

// Every route requires an authenticated ACTIVE user
router.use(authMiddleware);

router.get('/:id/games', getGames);
router.post('/:id/games', requireRole('ORGANIZER', 'ADMIN'), validateBody(createGameSchema), createGame);

export default router;
