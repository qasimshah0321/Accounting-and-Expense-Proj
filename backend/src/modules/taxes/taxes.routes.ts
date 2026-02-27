import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { tenantIsolation } from '../../middleware/multiTenant';
import * as ctrl from './taxes.controller';

const router = Router();
router.use(authenticate, tenantIsolation);

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getById);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.deleteTax);
router.patch('/:id/toggle-active', ctrl.toggleActive);
router.patch('/:id/set-default', ctrl.setDefault);

export default router;
