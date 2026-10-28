import { Router } from 'express';
import { login, loginSchema } from '../controllers/authController.js';
import { validateBody } from '../middleware/validateMiddleware.js';

const router = Router();

router.post('/login', validateBody(loginSchema), login);

export default router;
