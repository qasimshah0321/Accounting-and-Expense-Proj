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
router.get('/profit-and-loss', ctrl.profitAndLoss);
router.get('/receivables-ageing', ctrl.receivablesAgeing);
router.get('/payables-ageing', ctrl.payablesAgeing);
router.get('/inventory-valuation', ctrl.inventoryValuation);
router.get('/tax-summary', ctrl.taxSummary);
router.get('/balance-sheet', ctrl.balanceSheet);
router.get('/cash-flow', ctrl.cashFlow);

// Enhanced Financial Statement Reports (Section 2.1)
router.get('/profit-loss-comparison',    ctrl.profitLossComparison);
router.get('/balance-sheet-comparison',  ctrl.balanceSheetComparison);
router.get('/equity-changes',            ctrl.equityChanges);
router.get('/cash-flow-forecast',        ctrl.cashFlowForecast);
router.get('/profit-loss-by-department', ctrl.profitLossByDepartment);
router.get('/budget-vs-actual',          ctrl.budgetVsActual);

export default router;
