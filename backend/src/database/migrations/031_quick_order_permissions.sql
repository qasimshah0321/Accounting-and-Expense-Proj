-- Migration 031: Add Quick Order to role_menu_permissions for admin and salesperson

INSERT IGNORE INTO role_menu_permissions (id, company_id, role, menu_name, can_access, display_name)
SELECT UUID(), c.id, 'admin', 'Quick Order', 1, 'Quick Order'
FROM companies c;

INSERT IGNORE INTO role_menu_permissions (id, company_id, role, menu_name, can_access, display_name)
SELECT UUID(), c.id, 'salesperson', 'Quick Order', 1, 'Quick Order'
FROM companies c;
