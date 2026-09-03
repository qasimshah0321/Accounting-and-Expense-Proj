import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { tenantIsolation } from '../../middleware/multiTenant';
import * as ctrl from './approvals.controller';

const router = Router();
router.use(authenticate, tenantIsolation);

// Rules CRUD
router.get('/rules', ctrl.listRules);
router.post('/rules', ctrl.createRule);
router.put('/rules/:id', ctrl.updateRule);
router.delete('/rules/:id', ctrl.deleteRule);

// Pending requests for current user (based on their role)
router.get('/pending', ctrl.myPending);

// Approvals attached to a particular document
router.get('/document/:type/:id', ctrl.documentApprovals);

// Action a request
router.post('/:id/approve', ctrl.approve);
router.post('/:id/reject', ctrl.reject);

export default router;
