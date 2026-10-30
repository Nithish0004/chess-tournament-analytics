import { Router } from 'express';
import { getDashboardData } from '../controllers/dashboardController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware);
router.get('/', getDashboardData);

export default router;
