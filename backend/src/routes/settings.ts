import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth';
import {
  getSettings,
  updateSetting
} from '../controllers/settingsController';

export const settingsRouter = Router();

settingsRouter.use(authenticate);
settingsRouter.use(requirePermission('settings', 'manage'));

settingsRouter.get('/', getSettings);
settingsRouter.put('/:key', updateSetting);

