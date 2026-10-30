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
import { authMiddleware, requireRole } from '../middleware/authMiddleware.js';
import { validateBody } from '../middleware/validateMiddleware.js';

const router = Router();

// Every route requires an authenticated ACTIVE user
router.use(authMiddleware);

router.get('/', getPlayers);
router.get('/:id/analytics', getPlayerAnalytics);
router.get('/:id', getPlayerById);

router.post('/', requireRole('ORGANIZER', 'ADMIN'), validateBody(createPlayerSchema), createPlayer);
router.put('/:id', checkNoDirectRatingEdit, validateBody(updatePlayerSchema), updatePlayer);

export default router;
