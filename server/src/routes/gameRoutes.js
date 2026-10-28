import { Router } from 'express';
import { recordGameResult, recordResultSchema } from '../controllers/gameController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { validateBody } from '../middleware/validateMiddleware.js';

const router = Router();

router.post('/:id/result', requireAuth, validateBody(recordResultSchema), recordGameResult);

export default router;
