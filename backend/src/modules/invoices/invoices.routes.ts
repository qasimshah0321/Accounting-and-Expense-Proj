import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../../middleware/auth';
import { tenantIsolation } from '../../middleware/multiTenant';
import * as ctrl from './invoices.controller';
import { parseInvoiceImage } from './invoice-parser.controller';

const router = Router();
router.use(authenticate, tenantIsolation);

// Multer — memory storage, 10 MB limit, images + PDFs only
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only image files and PDFs are allowed'));
    }
  },
});

router.post('/parse-image', upload.single('invoice_file'), parseInvoiceImage);

router.get('/overdue', ctrl.getOverdue);
router.get('/next-number', ctrl.getNextNumber);
router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getById);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.deleteInvoice);
router.patch('/:id/status', ctrl.updateStatus);
router.post('/:id/record-payment', ctrl.recordPayment);
router.get('/:id/payments', ctrl.getPayments);

export default router;
