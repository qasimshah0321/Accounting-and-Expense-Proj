import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { tenantIsolation } from '../../middleware/multiTenant';
import * as ctrl from './push.controller';

const router = Router();

// VAPID public key is public — no auth needed
router.get('/vapid-public-key', ctrl.getVapidPublicKey);

// Subscribe/unsubscribe require authentication
router.post('/subscribe', authenticate, tenantIsolation, ctrl.subscribe);
router.delete('/unsubscribe', authenticate, tenantIsolation, ctrl.unsubscribe);

export default router;
