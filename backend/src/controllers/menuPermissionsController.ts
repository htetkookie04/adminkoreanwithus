import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';

/**
 * Get all menu permissions for a specific role
 * GET /menu-permissions/role/:roleId
 */
export const getRoleMenuPermissions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const roleId = parseInt(req.params.roleId);

    if (isNaN(roleId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role ID'
      });
    }

    const menuPermissions = await prisma.roleMenuPermission.findMany({
      where: {
        roleId: roleId
      },
      orderBy: {
        sortOrder: 'asc'
      }
    });

    res.json({
      success: true,
      data: menuPermissions
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get menu permissions for the current logged-in user
 * GET /menu-permissions/me
 */
export const getMyMenuPermissions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.roleId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    const menuPermissions = await prisma.roleMenuPermission.findMany({
      where: {
        roleId: req.user.roleId,
        enabled: true
      },
      orderBy: {
        sortOrder: 'asc'
      },
      select: {
        id: true,
        menuKey: true,
        menuLabel: true,
        menuPath: true,
        menuIcon: true,
        sortOrder: true
      }
    });

    res.json({
      success: true,
      data: menuPermissions
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all menu permissions for all roles (for admin management)
 * GET /menu-permissions
 */
export const getAllMenuPermissions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const menuPermissions = await prisma.roleMenuPermission.findMany({
      include: {
        role: {
          select: {
            id: true,
            name: true,
            description: true
          }
        }
      },
      orderBy: [
        { roleId: 'asc' },
        { sortOrder: 'asc' }
      ]
    });

    res.json({
      success: true,
      data: menuPermissions
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update menu permissions for a role (bulk update)
 * PUT /menu-permissions/role/:roleId
 */
export const updateRoleMenuPermissions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const roleId = parseInt(req.params.roleId);
    const { menuPermissions } = req.body;

    if (isNaN(roleId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role ID'
      });
    }

    if (!Array.isArray(menuPermissions)) {
      return res.status(400).json({
        success: false,
        message: 'menuPermissions must be an array'
      });
    }

    // Delete existing permissions for this role
    await prisma.roleMenuPermission.deleteMany({
      where: {
        roleId: roleId
      }
    });

    // Insert new permissions
    if (menuPermissions.length > 0) {
      await prisma.roleMenuPermission.createMany({
        data: menuPermissions.map((menu: any, index: number) => ({
          roleId: roleId,
          menuKey: menu.menuKey,
          menuLabel: menu.menuLabel,
          menuPath: menu.menuPath,
          menuIcon: menu.menuIcon || null,
          sortOrder: menu.sortOrder !== undefined ? menu.sortOrder : index,
          enabled: menu.enabled !== undefined ? menu.enabled : true
        }))
      });
    }

    // Fetch updated permissions
    const updatedPermissions = await prisma.roleMenuPermission.findMany({
      where: {
        roleId: roleId
      },
      orderBy: {
        sortOrder: 'asc'
      }
    });

    res.json({
      success: true,
      message: 'Menu permissions updated successfully',
      data: updatedPermissions
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle a specific menu permission for a role
 * PATCH /menu-permissions/:id/toggle
 */
export const toggleMenuPermission = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid permission ID'
      });
    }

    const menuPermission = await prisma.roleMenuPermission.findUnique({
      where: { id }
    });

    if (!menuPermission) {
      return res.status(404).json({
        success: false,
        message: 'Menu permission not found'
      });
    }

    const updatedPermission = await prisma.roleMenuPermission.update({
      where: { id },
      data: {
        enabled: !menuPermission.enabled
      }
    });

    res.json({
      success: true,
      message: 'Menu permission toggled successfully',
      data: updatedPermission
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get available menu options (master list)
 * GET /menu-permissions/available-menus
 */
export const getAvailableMenus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Define all available menus in the system
    const availableMenus = [
      { menuKey: 'dashboard', menuLabel: 'Dashboard', menuPath: '/', menuIcon: 'LayoutDashboard' },
      { menuKey: 'courses', menuLabel: 'Courses', menuPath: '/courses', menuIcon: 'BookOpen' },
      { menuKey: 'users', menuLabel: 'Users', menuPath: '/users', menuIcon: 'Users' },
      { menuKey: 'enrollments', menuLabel: 'Enrollments', menuPath: '/enrollments', menuIcon: 'CheckCircle' },
      { menuKey: 'lectures', menuLabel: 'Lectures', menuPath: '/lectures', menuIcon: 'Video' },
      { menuKey: 'timetable', menuLabel: 'Timetable', menuPath: '/timetable', menuIcon: 'Calendar' },
      { menuKey: 'finance', menuLabel: 'Finance', menuPath: '/finance/revenue', menuIcon: 'DollarSign' },
      { menuKey: 'settings', menuLabel: 'Settings', menuPath: '/settings', menuIcon: 'Settings' },
      { menuKey: 'my-lectures', menuLabel: 'My Lectures', menuPath: '/my-lectures', menuIcon: 'Video' }
    ];

    res.json({
      success: true,
      data: availableMenus
    });
  } catch (error) {
    next(error);
  }
};

