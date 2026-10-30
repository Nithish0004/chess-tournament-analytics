import { Router } from 'express';
import { recordGameResult, recordResultSchema, getRecentResults } from '../controllers/gameController.js';
import { authMiddleware, requireRole } from '../middleware/authMiddleware.js';
import { validateBody } from '../middleware/validateMiddleware.js';

const router = Router();

// Every route requires an authenticated ACTIVE user
router.use(authMiddleware);

router.get('/recent', getRecentResults);
router.post('/:id/result', requireRole('ORGANIZER', 'ADMIN'), validateBody(recordResultSchema), recordGameResult);

export default router;
