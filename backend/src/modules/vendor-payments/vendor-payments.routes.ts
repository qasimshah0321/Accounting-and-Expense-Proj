import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { tenantIsolation } from '../../middleware/multiTenant';
import * as ctrl from './vendor-payments.controller';

const router = Router();
router.use(authenticate, tenantIsolation);

router.get('/unallocated', ctrl.getUnallocated);
router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getById);
router.post('/:id/allocate', ctrl.allocate);
router.delete('/:id', ctrl.deletePayment);

export default router;
