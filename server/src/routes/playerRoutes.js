import { Router } from 'express';
import {
  getPlayers,
  getPlayerById,
  createPlayer,
  updatePlayer,
  getPlayerAnalytics,
  createPlayerSchema,
  updatePlayerSchema,
  checkNoDirectRatingEdit
} from '../controllers/playerController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { validateBody } from '../middleware/validateMiddleware.js';

const router = Router();

router.get('/', getPlayers);
router.post('/', requireAuth, validateBody(createPlayerSchema), createPlayer);
router.get('/:id/analytics', getPlayerAnalytics);
router.get('/:id', getPlayerById);
router.put('/:id', requireAuth, checkNoDirectRatingEdit, validateBody(updatePlayerSchema), updatePlayer);

export default router;
