import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import * as ctrl from './auth.controller';

const router = Router();

router.post('/register', ctrl.register);
router.post('/login', ctrl.login);
router.post('/logout', authenticate, ctrl.logout);
router.post('/refresh-token', ctrl.refreshToken);
router.get('/me', authenticate, ctrl.getMe);
router.put('/change-password', authenticate, ctrl.changePassword);

export default router;
