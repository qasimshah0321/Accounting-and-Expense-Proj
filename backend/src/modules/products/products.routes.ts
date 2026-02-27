import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { tenantIsolation } from '../../middleware/multiTenant';
import * as ctrl from './products.controller';

const router = Router();
router.use(authenticate, tenantIsolation);

router.get('/low-stock', ctrl.getLowStock);
router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getById);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.deleteProduct);
router.get('/:id/stock-levels', ctrl.getStockLevels);
router.get('/:id/transaction-history', ctrl.getTransactionHistory);
router.post('/:id/adjust-stock', ctrl.adjustStock);

export default router;
