import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { tenantIsolation } from '../../middleware/multiTenant';
import * as ctrl from './expenses.controller';

const router = Router();
router.use(authenticate, tenantIsolation);

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getById);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.deleteExpense);
router.patch('/:id/status', ctrl.updateStatus);
router.post('/:id/approve', ctrl.approveExpense);
router.post('/:id/mark-paid', ctrl.markPaid);

export default router;
