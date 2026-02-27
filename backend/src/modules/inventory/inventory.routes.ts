import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { tenantIsolation } from '../../middleware/multiTenant';
import * as ctrl from './inventory.controller';

const router = Router();
router.use(authenticate, tenantIsolation);

// Transactions
router.get('/transactions', ctrl.listTransactions);
router.post('/transactions/adjust', ctrl.adjustStock);
router.post('/transactions/transfer', ctrl.transferStock);

// Reports
router.get('/stock-by-location', ctrl.getStockByLocation);
router.get('/low-stock', ctrl.getLowStockReport);

// Locations
router.get('/locations', ctrl.listLocations);
router.post('/locations', ctrl.createLocation);
router.put('/locations/:id', ctrl.updateLocation);
router.delete('/locations/:id', ctrl.deleteLocation);

export default router;
