import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { tenantIsolation } from '../../middleware/multiTenant';
import * as ctrl from './goods-received-notes.controller';

const router = Router();
router.use(authenticate, tenantIsolation);

router.get('/', ctrl.list);
router.get('/next-number', ctrl.peekNextNumber);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getById);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.deleteGRN);
router.patch('/:id/status', ctrl.updateStatus);
router.post('/:id/receive', ctrl.receiveGoods);
router.post('/:id/convert-to-bill', ctrl.convertToBill);
router.get('/:id/tracking', ctrl.getTracking);

export default router;
