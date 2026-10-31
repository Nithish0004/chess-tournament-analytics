import { Router } from 'express';
import {
  getUsers,
  approveOrganizer,
  suspendUser,
  reactivateUser,
  updateUserRole
} from '../controllers/adminController.js';
import { authMiddleware, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

// All admin routes require an active ADMIN user
router.use(authMiddleware);
router.use(requireRole('ADMIN'));

router.get('/users', getUsers);
router.post('/users/:id/approve', approveOrganizer);
router.post('/users/:id/suspend', suspendUser);
router.post('/users/:id/reactivate', reactivateUser);
router.put('/users/:id/role', updateUserRole);
router.patch('/users/:id/role', updateUserRole);
router.post('/users/:id/role', updateUserRole);

export default router;
