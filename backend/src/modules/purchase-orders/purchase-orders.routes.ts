import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { tenantIsolation } from '../../middleware/multiTenant';
import * as ctrl from './purchase-orders.controller';

const router = Router();
router.use(authenticate, tenantIsolation);

router.get('/next-number', ctrl.getNextNumber);
router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getById);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.deletePurchaseOrder);
router.patch('/:id/status', ctrl.updateStatus);

export default router;
