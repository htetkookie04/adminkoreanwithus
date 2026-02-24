import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import {
  getRoleMenuPermissions,
  getMyMenuPermissions,
  getAllMenuPermissions,
  updateRoleMenuPermissions,
  toggleMenuPermission,
  getAvailableMenus
} from '../controllers/menuPermissionsController';

export const menuPermissionsRouter = Router();

// All routes require authentication
menuPermissionsRouter.use(authenticate);

// GET /menu-permissions/me - Get menu permissions for current user (any authenticated user)
menuPermissionsRouter.get('/me', getMyMenuPermissions);

// GET /menu-permissions/available-menus - Get all available menu options (any authenticated user)
menuPermissionsRouter.get('/available-menus', getAvailableMenus);

// SECURITY: Admin-only routes — prevent BOLA and privilege escalation
menuPermissionsRouter.get('/', requireRole('super_admin', 'admin'), getAllMenuPermissions);
menuPermissionsRouter.get('/role/:roleId', requireRole('super_admin', 'admin'), getRoleMenuPermissions);
menuPermissionsRouter.put('/role/:roleId', requireRole('super_admin', 'admin'), updateRoleMenuPermissions);
menuPermissionsRouter.patch('/:id/toggle', requireRole('super_admin', 'admin'), toggleMenuPermission);

export default menuPermissionsRouter;

