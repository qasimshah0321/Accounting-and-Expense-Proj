import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { tenantIsolation } from '../../middleware/multiTenant';
import * as ctrl from './pra.controller';

const router = Router();
router.use(authenticate, tenantIsolation);

// Company-level PRA config
router.get('/config', ctrl.getConfig);
router.put('/config', ctrl.saveConfig);
router.post('/test-connection', ctrl.testConnection);

// Per-invoice
router.post('/invoices/:invoiceId/submit', ctrl.submitInvoice);
router.get('/invoices/:invoiceId/status', ctrl.getInvoiceStatus);

export default router;
