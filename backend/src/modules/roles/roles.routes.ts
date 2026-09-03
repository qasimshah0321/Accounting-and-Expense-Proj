import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { tenantIsolation } from '../../middleware/multiTenant';
import * as ctrl from './roles.controller';

const router = Router();
router.use(authenticate, tenantIsolation);

// All authenticated users can read roles (needed for user creation dropdown)
router.get('/', ctrl.list);

// Only admin can manage roles
router.post('/', authorize('admin'), ctrl.create);
router.put('/:id', authorize('admin'), ctrl.update);
router.delete('/:id', authorize('admin'), ctrl.deleteRole);

export default router;
