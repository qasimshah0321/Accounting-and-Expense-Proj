import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { tenantIsolation } from '../../middleware/multiTenant';
import * as ctrl from './fbr.controller';

const router = Router();
router.use(authenticate, tenantIsolation);

// Company-level DI config
router.get('/config', ctrl.getConfig);
router.put('/config', ctrl.saveConfig);
router.post('/test-connection', ctrl.testConnection);

// Reference data (provinces / hscodes / uom / doctypes / sroitems / transtypes)
router.post('/reference/sync', ctrl.syncReference);   // optional ?type=hscodes
router.get('/reference/:type', ctrl.getReference);

// Buyer registration lookup (FBR Get_Reg_Type)
router.get('/lookup/registration', ctrl.lookupRegistration); // ?regno=

// Per-invoice
router.post('/invoices/:invoiceId/validate', ctrl.validateInvoice); // dry run
router.post('/invoices/:invoiceId/submit', ctrl.submitInvoice);
router.get('/invoices/:invoiceId/status', ctrl.getInvoiceStatus);

export default router;
