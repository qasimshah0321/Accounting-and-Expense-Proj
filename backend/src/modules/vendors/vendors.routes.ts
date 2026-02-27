import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { tenantIsolation } from '../../middleware/multiTenant';
import * as ctrl from './vendors.controller';

const router = Router();
router.use(authenticate, tenantIsolation);

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getById);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.deleteVendor);
router.get('/:id/bills', ctrl.getBills);
router.get('/:id/payments', ctrl.getPayments);
router.get('/:id/outstanding-balance', ctrl.getOutstandingBalance);

export default router;
