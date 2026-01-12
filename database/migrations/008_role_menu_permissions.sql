-- Role Menu Permissions Migration
-- This table maps roles to allowed menu items for dynamic sidebar rendering

CREATE TABLE role_menu_permissions (
  id SERIAL PRIMARY KEY,
  role_id INT REFERENCES roles(id) ON DELETE CASCADE,
  menu_key TEXT NOT NULL, -- e.g. 'dashboard', 'courses', 'users', 'enrollments', 'lectures', 'timetable', 'settings'
  menu_label TEXT NOT NULL, -- Display name for the menu
  menu_path TEXT NOT NULL, -- Route path e.g. '/', '/courses'
  menu_icon TEXT, -- Icon identifier (lucide-react icon name)
  sort_order INT DEFAULT 0, -- Order in which menus appear
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create unique constraint to prevent duplicate menu assignments per role
CREATE UNIQUE INDEX role_menu_permissions_role_menu_idx ON role_menu_permissions(role_id, menu_key);

-- Create indexes for faster queries
CREATE INDEX role_menu_permissions_role_idx ON role_menu_permissions(role_id);
CREATE INDEX role_menu_permissions_enabled_idx ON role_menu_permissions(enabled);

-- Insert default menu permissions for Super Admin (role_id = 1)
INSERT INTO role_menu_permissions (role_id, menu_key, menu_label, menu_path, menu_icon, sort_order, enabled) VALUES
  (1, 'dashboard', 'Dashboard', '/', 'LayoutDashboard', 1, true),
  (1, 'courses', 'Courses', '/courses', 'BookOpen', 2, true),
  (1, 'users', 'Users', '/users', 'Users', 3, true),
  (1, 'enrollments', 'Enrollments', '/enrollments', 'CheckCircle', 4, true),
  (1, 'lectures', 'Lectures', '/lectures', 'Video', 5, true),
  (1, 'timetable', 'Timetable', '/timetable', 'Calendar', 6, true),
  (1, 'settings', 'Settings', '/settings', 'Settings', 7, true);

-- Insert default menu permissions for Admin (role_id = 2)
INSERT INTO role_menu_permissions (role_id, menu_key, menu_label, menu_path, menu_icon, sort_order, enabled) VALUES
  (2, 'dashboard', 'Dashboard', '/', 'LayoutDashboard', 1, true),
  (2, 'courses', 'Courses', '/courses', 'BookOpen', 2, true),
  (2, 'users', 'Users', '/users', 'Users', 3, true),
  (2, 'enrollments', 'Enrollments', '/enrollments', 'CheckCircle', 4, true),
  (2, 'lectures', 'Lectures', '/lectures', 'Video', 5, true),
  (2, 'timetable', 'Timetable', '/timetable', 'Calendar', 6, true),
  (2, 'settings', 'Settings', '/settings', 'Settings', 7, true);

-- Insert default menu permissions for Course Manager (role_id = 3)
INSERT INTO role_menu_permissions (role_id, menu_key, menu_label, menu_path, menu_icon, sort_order, enabled) VALUES
  (3, 'courses', 'Courses', '/courses', 'BookOpen', 1, true),
  (3, 'lectures', 'Lectures', '/lectures', 'Video', 2, true),
  (3, 'timetable', 'Timetable', '/timetable', 'Calendar', 3, true),
  (3, 'settings', 'Settings', '/settings', 'Settings', 4, true);

-- Insert default menu permissions for Teacher (role_id = 4)
INSERT INTO role_menu_permissions (role_id, menu_key, menu_label, menu_path, menu_icon, sort_order, enabled) VALUES
  (4, 'courses', 'Courses', '/courses', 'BookOpen', 1, true),
  (4, 'lectures', 'Lectures', '/lectures', 'Video', 2, true),
  (4, 'timetable', 'Timetable', '/timetable', 'Calendar', 3, true),
  (4, 'settings', 'Settings', '/settings', 'Settings', 4, true);

-- Insert default menu permissions for Support (role_id = 5)
INSERT INTO role_menu_permissions (role_id, menu_key, menu_label, menu_path, menu_icon, sort_order, enabled) VALUES
  (5, 'users', 'Users', '/users', 'Users', 1, true),
  (5, 'enrollments', 'Enrollments', '/enrollments', 'CheckCircle', 2, true),
  (5, 'settings', 'Settings', '/settings', 'Settings', 3, true);

-- Insert default menu permissions for Sales (role_id = 6)
INSERT INTO role_menu_permissions (role_id, menu_key, menu_label, menu_path, menu_icon, sort_order, enabled) VALUES
  (6, 'courses', 'Courses', '/courses', 'BookOpen', 1, true),
  (6, 'enrollments', 'Enrollments', '/enrollments', 'CheckCircle', 2, true),
  (6, 'settings', 'Settings', '/settings', 'Settings', 3, true);

-- Insert default menu permissions for Viewer (role_id = 7)
INSERT INTO role_menu_permissions (role_id, menu_key, menu_label, menu_path, menu_icon, sort_order, enabled) VALUES
  (7, 'lectures', 'Lectures', '/lectures', 'Video', 1, true),
  (7, 'settings', 'Settings', '/settings', 'Settings', 2, true);

-- Insert default menu permissions for Student (role_id = 8, if exists)
-- Note: Adjust role_id if student has a different ID in your database
INSERT INTO role_menu_permissions (role_id, menu_key, menu_label, menu_path, menu_icon, sort_order, enabled) VALUES
  (8, 'dashboard', 'Dashboard', '/', 'LayoutDashboard', 1, true),
  (8, 'my-lectures', 'My Lectures', '/my-lectures', 'Video', 2, true),
  (8, 'settings', 'Settings', '/settings', 'Settings', 3, true)
ON CONFLICT DO NOTHING; -- Skip if role_id 8 doesn't exist

-- Insert default menu permissions for User role (if it exists with a specific role_id)
-- Check your roles table for the exact role_id
-- Assuming 'user' might be a separate role or merged with viewer
-- This is a placeholder - adjust based on your actual role setup

