import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { tenantIsolation } from '../../middleware/multiTenant';
import * as ctrl from './banking.controller';

const router = Router();
router.use(authenticate, tenantIsolation);

// Bank Accounts
router.get('/bank-accounts', ctrl.listBankAccounts);
router.post('/bank-accounts', ctrl.createBankAccount);
router.get('/bank-accounts/:id', ctrl.getBankAccount);
router.put('/bank-accounts/:id', ctrl.updateBankAccount);
router.delete('/bank-accounts/:id', ctrl.deleteBankAccount);

// Transactions (nested under bank account)
router.get('/bank-accounts/:id/transactions', ctrl.listTransactions);
router.post('/bank-accounts/:id/transactions', ctrl.createTransaction);
router.put('/bank-accounts/:id/transactions/:txId', ctrl.updateTransaction);
router.delete('/bank-accounts/:id/transactions/:txId', ctrl.deleteTransaction);

// Reconciliation
router.get('/bank-accounts/:id/reconciliation', ctrl.getReconciliation);
router.post('/bank-accounts/:id/reconciliation/start', ctrl.startReconciliation);
router.post('/bank-accounts/:id/reconciliation/:recId/mark-reconciled/:txId', ctrl.markReconciled);
router.post('/bank-accounts/:id/reconciliation/:recId/complete', ctrl.completeReconciliation);

// Summary
router.get('/bank-summary', ctrl.getBankSummary);

export default router;
