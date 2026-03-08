import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { tenantIsolation } from '../../middleware/multiTenant';
import * as ctrl from './sales-orders.controller';

const router = Router();
router.use(authenticate, tenantIsolation);

router.get('/next-number', ctrl.getNextNumber);
router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getById);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.deleteSalesOrder);
router.patch('/:id/status', authorize('admin', 'salesperson'), ctrl.updateStatus);
router.post('/:id/convert-to-delivery-note', authorize('admin', 'salesperson'), ctrl.convertToDeliveryNote);
router.post('/:id/convert-to-invoice', authorize('admin', 'salesperson'), ctrl.convertToInvoice);
router.get('/:id/fulfillment-status', ctrl.getFulfillmentStatus);
router.get('/:id/delivery-notes', ctrl.getDeliveryNotes);

export default router;
