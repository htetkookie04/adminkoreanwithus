-- Add Finance menu for Super Admin (role_id = 1) and Admin (role_id = 2)
-- Insert after Timetable (sort_order 6) so Finance gets sort_order 7 and Settings becomes 8

INSERT INTO role_menu_permissions (role_id, menu_key, menu_label, menu_path, menu_icon, sort_order, enabled)
VALUES
  (1, 'finance', 'Finance', '/finance/revenue', 'DollarSign', 7, true),
  (2, 'finance', 'Finance', '/finance/revenue', 'DollarSign', 7, true)
ON CONFLICT (role_id, menu_key) DO UPDATE SET
  menu_label = EXCLUDED.menu_label,
  menu_path = EXCLUDED.menu_path,
  menu_icon = EXCLUDED.menu_icon,
  sort_order = EXCLUDED.sort_order,
  enabled = EXCLUDED.enabled,
  updated_at = now();

-- Bump Settings sort_order so it appears after Finance (optional, for consistent order)
UPDATE role_menu_permissions SET sort_order = 8, updated_at = now()
WHERE role_id IN (1, 2) AND menu_key = 'settings';
