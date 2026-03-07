import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { tenantIsolation } from '../../middleware/multiTenant';
import * as ctrl from './role-permissions.controller';

const router = Router();
router.use(authenticate, tenantIsolation);

router.get('/my-menus', ctrl.getMyMenus);
router.get('/', authorize('admin'), ctrl.getAllPermissions);
router.put('/', authorize('admin'), ctrl.updatePermissions);

export default router;
