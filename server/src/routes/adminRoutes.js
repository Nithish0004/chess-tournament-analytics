import { Router } from 'express';
import {
  getUsers,
  getUserById,
  updateUser,
  approveUser,
  rejectUser,
  suspendUser,
  reactivateUser,
  updateUserRole,
  getAuditLogs,
  getAdminOverview,
  getDbStatus
} from '../controllers/adminController.js';
import { authMiddleware, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

// All admin routes require an active ADMIN user
router.use(authMiddleware);
router.use(requireRole('ADMIN'));

router.get('/overview', getAdminOverview);
router.get('/system/db-status', getDbStatus);
router.get('/users', getUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id', updateUser);
router.get('/audit-log', getAuditLogs);
router.post('/users/:id/approve', approveUser);
router.post('/users/:id/reject', rejectUser);
router.post('/users/:id/suspend', suspendUser);
router.post('/users/:id/reactivate', reactivateUser);
router.put('/users/:id/role', updateUserRole);
router.patch('/users/:id/role', updateUserRole);
router.post('/users/:id/role', updateUserRole);

export default router;
