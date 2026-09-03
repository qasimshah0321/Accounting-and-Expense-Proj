import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { tenantIsolation } from '../../middleware/multiTenant';
import * as ctrl from './departments.controller';

const router = Router();
router.use(authenticate, tenantIsolation, authorize('admin'));

router.get('/', ctrl.list);
router.get('/unassigned-users', ctrl.getUnassigned);
router.get('/:id', ctrl.getOne);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.deleteDept);
router.put('/:id/permissions', ctrl.updatePermissions);
router.post('/assign-user', ctrl.assignUser);

export default router;
