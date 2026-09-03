import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { tenantIsolation } from '../../middleware/multiTenant';
import * as ctrl from './accounting.controller';

const router = Router();
router.use(authenticate, tenantIsolation);

// Chart of Accounts
router.get('/accounts', ctrl.listAccounts);
router.post('/accounts', ctrl.createAccount);
router.get('/accounts/:id', ctrl.getAccount);
router.put('/accounts/:id', ctrl.updateAccount);
router.delete('/accounts/:id', ctrl.deleteAccount);

// Journal Entries
router.get('/journal-entries/next-number', ctrl.getNextJENumber);
router.get('/journal-entries', ctrl.listJournalEntries);
router.post('/journal-entries', ctrl.createJournalEntry);
router.get('/journal-entries/:id', ctrl.getJournalEntry);
router.put('/journal-entries/:id', ctrl.updateJournalEntry);
router.post('/journal-entries/:id/reverse', ctrl.reverseJournalEntry);

// GL Reports
router.get('/general-ledger', ctrl.getGeneralLedger);
router.get('/trial-balance', ctrl.getTrialBalance);

// Opening Balance
router.get('/opening-balance', ctrl.getOpeningBalance);
router.post('/opening-balance', ctrl.postOpeningBalance);

// Year-End Close
router.get('/year-end-close', ctrl.getYearEndCloses);
router.post('/year-end-close', ctrl.performYearEndClose);

export default router;
