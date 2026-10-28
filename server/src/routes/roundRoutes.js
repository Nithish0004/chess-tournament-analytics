import { Router } from 'express';
import {
  createGame,
  getGames,
  createGameSchema
} from '../controllers/roundController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { validateBody } from '../middleware/validateMiddleware.js';

const router = Router();

router.post('/:id/games', requireAuth, validateBody(createGameSchema), createGame);
router.get('/:id/games', getGames);

export default router;
