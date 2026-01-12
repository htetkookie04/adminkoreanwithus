import { Router } from 'express';
import { authenticate } from '../middleware/auth';
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

// GET /menu-permissions/me - Get menu permissions for current user
menuPermissionsRouter.get('/me', getMyMenuPermissions);

// GET /menu-permissions/available-menus - Get all available menu options
menuPermissionsRouter.get('/available-menus', getAvailableMenus);

// GET /menu-permissions - Get all menu permissions (admin only)
menuPermissionsRouter.get('/', getAllMenuPermissions);

// GET /menu-permissions/role/:roleId - Get menu permissions for a specific role
menuPermissionsRouter.get('/role/:roleId', getRoleMenuPermissions);

// PUT /menu-permissions/role/:roleId - Update menu permissions for a role (bulk)
menuPermissionsRouter.put('/role/:roleId', updateRoleMenuPermissions);

// PATCH /menu-permissions/:id/toggle - Toggle a menu permission
menuPermissionsRouter.patch('/:id/toggle', toggleMenuPermission);

export default menuPermissionsRouter;

