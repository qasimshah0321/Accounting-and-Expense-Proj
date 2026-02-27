import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { tenantIsolation } from '../../middleware/multiTenant';
import * as ctrl from './utils.controller';

const router = Router();

// Health check (public)
router.get('/health', ctrl.healthCheck as any);

// Protected routes
router.use(authenticate, tenantIsolation);
router.get('/company', ctrl.getCompanyInfo);
router.put('/company', ctrl.updateCompanyInfo);
router.get('/document-sequences', ctrl.getDocumentSequences);
router.patch('/document-sequences/:document_type/reset', ctrl.resetDocumentSequence);

export default router;
