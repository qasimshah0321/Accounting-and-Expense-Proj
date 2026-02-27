import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// Route imports
import authRoutes from './modules/auth/auth.routes';
import customerRoutes from './modules/customers/customers.routes';
import vendorRoutes from './modules/vendors/vendors.routes';
import productRoutes from './modules/products/products.routes';
import taxRoutes from './modules/taxes/taxes.routes';
import shipViaRoutes from './modules/ship-via/ship-via.routes';
import estimateRoutes from './modules/estimates/estimates.routes';
import salesOrderRoutes from './modules/sales-orders/sales-orders.routes';
import deliveryNoteRoutes from './modules/delivery-notes/delivery-notes.routes';
import invoiceRoutes from './modules/invoices/invoices.routes';
import billRoutes from './modules/bills/bills.routes';
import expenseRoutes from './modules/expenses/expenses.routes';
import customerPaymentRoutes from './modules/customer-payments/customer-payments.routes';
import vendorPaymentRoutes from './modules/vendor-payments/vendor-payments.routes';
import inventoryRoutes from './modules/inventory/inventory.routes';
import reportRoutes from './modules/reports/reports.routes';
import utilsRoutes from './modules/utils/utils.routes';

const app = express();

// Security & parsing middleware
app.use(helmet());
app.use(cors({ origin: config.cors.origin, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (config.nodeEnv !== 'test') {
  app.use(morgan('combined'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api', limiter);

// Routes
const API_PREFIX = '/api/v1';
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/customers`, customerRoutes);
app.use(`${API_PREFIX}/vendors`, vendorRoutes);
app.use(`${API_PREFIX}/products`, productRoutes);
app.use(`${API_PREFIX}/taxes`, taxRoutes);
app.use(`${API_PREFIX}/ship-via`, shipViaRoutes);
app.use(`${API_PREFIX}/estimates`, estimateRoutes);
app.use(`${API_PREFIX}/sales-orders`, salesOrderRoutes);
app.use(`${API_PREFIX}/delivery-notes`, deliveryNoteRoutes);
app.use(`${API_PREFIX}/invoices`, invoiceRoutes);
app.use(`${API_PREFIX}/bills`, billRoutes);
app.use(`${API_PREFIX}/expenses`, expenseRoutes);
app.use(`${API_PREFIX}/customer-payments`, customerPaymentRoutes);
app.use(`${API_PREFIX}/vendor-payments`, vendorPaymentRoutes);
app.use(`${API_PREFIX}/inventory`, inventoryRoutes);
app.use(`${API_PREFIX}/reports`, reportRoutes);
app.use(`${API_PREFIX}`, utilsRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
