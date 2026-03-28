import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { getNotifications, readAll, readOne } from './notifications.controller';

const router = Router();

router.use(authenticate);

router.get('/',              getNotifications);
router.put('/read-all',      readAll);
router.put('/:id/read',      readOne);

export default router;
