import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { tenantIsolation } from '../../middleware/multiTenant';
import * as ctrl from './budgets.controller';

const router = Router();
router.use(authenticate, tenantIsolation);

router.get('/',           ctrl.listPeriods);
router.post('/',          ctrl.createPeriod);
router.get('/:id',        ctrl.getPeriod);
router.put('/:id',        ctrl.updatePeriod);
router.delete('/:id',     ctrl.deletePeriod);
router.get('/:id/lines',  ctrl.getLines);
router.post('/:id/lines', ctrl.saveLines);

export default router;
