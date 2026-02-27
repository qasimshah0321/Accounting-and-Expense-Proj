import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { tenantIsolation } from '../../middleware/multiTenant';
import * as ctrl from './delivery-notes.controller';

const router = Router();
router.use(authenticate, tenantIsolation);

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getById);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.deleteDeliveryNote);
router.patch('/:id/status', ctrl.updateStatus);
router.post('/:id/ship', ctrl.ship);
router.post('/:id/mark-delivered', ctrl.markDelivered);
router.post('/:id/convert-to-invoice', ctrl.convertToInvoice);
router.get('/:id/tracking', ctrl.getTracking);

export default router;
