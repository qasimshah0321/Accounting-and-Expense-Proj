import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { tenantIsolation } from '../../middleware/multiTenant';
import * as ctrl from './reports.controller';

const router = Router();
router.use(authenticate, tenantIsolation);

router.get('/dashboard', ctrl.dashboard);
router.get('/sales-summary', ctrl.salesSummary);
router.get('/expense-summary', ctrl.expenseSummary);
router.get('/profit-loss', ctrl.profitLoss);
router.get('/receivables-ageing', ctrl.receivablesAgeing);
router.get('/payables-ageing', ctrl.payablesAgeing);
router.get('/inventory-valuation', ctrl.inventoryValuation);

export default router;
