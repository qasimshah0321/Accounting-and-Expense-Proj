import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { tenantIsolation } from '../../middleware/multiTenant';
import * as ctrl from './invoices.controller';

const router = Router();
router.use(authenticate, tenantIsolation);

router.get('/overdue', ctrl.getOverdue);
router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getById);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.deleteInvoice);
router.patch('/:id/status', ctrl.updateStatus);
router.post('/:id/record-payment', ctrl.recordPayment);
router.get('/:id/payments', ctrl.getPayments);

export default router;
