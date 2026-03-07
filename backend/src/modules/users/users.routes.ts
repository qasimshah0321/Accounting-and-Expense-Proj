import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { tenantIsolation } from '../../middleware/multiTenant';
import * as ctrl from './users.controller';

const router = Router();
router.use(authenticate, tenantIsolation, authorize('admin'));

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.deleteUser);
router.put('/:id/link-customer', ctrl.linkCustomer);
router.delete('/:id/link-customer', ctrl.unlinkCustomer);

export default router;
