import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { tenantIsolation } from '../../middleware/multiTenant';
import * as ctrl from './recurring.controller';

const router = Router();

router.use(authenticate, tenantIsolation);

router.get('/', ctrl.listRecurring);
router.post('/', ctrl.createRecurring);
router.put('/:id', ctrl.updateRecurring);
router.delete('/:id', ctrl.deleteRecurring);
router.post('/:id/generate', ctrl.generateDocument);

export default router;
