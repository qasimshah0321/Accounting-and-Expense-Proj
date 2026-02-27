import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { tenantIsolation } from '../../middleware/multiTenant';
import * as ctrl from './customers.controller';

const router = Router();
router.use(authenticate, tenantIsolation);

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getById);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.deleteCustomer);
router.get('/:id/invoices', ctrl.getInvoices);
router.get('/:id/sales-orders', ctrl.getSalesOrders);
router.get('/:id/outstanding-balance', ctrl.getOutstandingBalance);

export default router;
