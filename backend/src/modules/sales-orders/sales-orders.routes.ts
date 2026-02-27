import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { tenantIsolation } from '../../middleware/multiTenant';
import * as ctrl from './sales-orders.controller';

const router = Router();
router.use(authenticate, tenantIsolation);

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getById);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.deleteSalesOrder);
router.patch('/:id/status', ctrl.updateStatus);
router.post('/:id/convert-to-delivery-note', ctrl.convertToDeliveryNote);
router.post('/:id/convert-to-invoice', ctrl.convertToInvoice);
router.get('/:id/fulfillment-status', ctrl.getFulfillmentStatus);
router.get('/:id/delivery-notes', ctrl.getDeliveryNotes);

export default router;
