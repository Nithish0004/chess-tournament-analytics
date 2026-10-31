import { Router } from 'express';
import { recordGameResult, recordResultSchema, getRecentResults } from '../controllers/gameController.js';
import { authMiddleware, requireTournamentAccess } from '../middleware/authMiddleware.js';
import { validateBody } from '../middleware/validateMiddleware.js';

const router = Router();

// Every route requires an authenticated ACTIVE user
router.use(authMiddleware);

router.get('/recent', getRecentResults);
router.post('/:id/result', requireTournamentAccess('game'), validateBody(recordResultSchema), recordGameResult);

export default router;
