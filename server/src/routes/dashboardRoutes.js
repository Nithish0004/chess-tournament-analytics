import { Router } from 'express';
import { getDashboardData, getMeDashboard } from '../controllers/dashboardController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware);
router.get('/', getDashboardData);
router.get('/me', getMeDashboard);

export default router;
