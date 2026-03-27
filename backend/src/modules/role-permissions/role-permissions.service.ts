import { pool } from '../../config/database';
import { Connection } from 'mysql2/promise';

// All menu names that are seeded by default
export const ALL_MENUS = [
  { name: 'Dashboard', category: 'General' },
  { name: 'Invoices', category: 'Sales' },
  { name: 'Sales Order', category: 'Sales' },
  { name: 'Delivery Notes', category: 'Sales' },
  { name: 'Estimates/Quotations', category: 'Sales' },
  { name: 'Customer Payments', category: 'Sales' },
  { name: 'Bills', category: 'Purchases' },
  { name: 'Expenses', category: 'Purchases' },
  { name: 'Purchase Order', category: 'Purchases' },
  { name: 'Bill Payments', category: 'Purchases' },
  { name: 'Customer Center', category: 'Contacts' },
  { name: 'Vendor Center', category: 'Contacts' },
  { name: 'Product Center', category: 'Inventory' },
  { name: 'Stock Valuation', category: 'Inventory' },
  { name: 'Stock Mobility', category: 'Inventory' },
  { name: 'Financial Statements', category: 'Reports' },
  { name: 'Revenue & Sales Analysis', category: 'Reports' },
  { name: 'Cost & Expense Analytics', category: 'Reports' },
  { name: 'Receivables & Payables', category: 'Reports' },
  { name: 'Planning & Performance Analysis', category: 'Reports' },
  { name: 'Banking Center', category: 'Banking' },
  { name: 'Chart of Accounts', category: 'Accounting' },
  { name: 'Journal Entries', category: 'Accounting' },
  { name: 'General Ledger', category: 'Accounting' },
  { name: 'Trial Balance', category: 'Accounting' },
  { name: 'Recurring Documents', category: 'Settings' },
  { name: 'Company Settings', category: 'Settings' },
  { name: 'ERP Flow Guide', category: 'Settings' },
  { name: 'Tax', category: 'Settings' },
  { name: 'Ship Via', category: 'Settings' },
  { name: 'Users & Roles', category: 'Settings' },
  { name: 'Role Permissions', category: 'Settings' },
];

export const getMyMenus = async (companyId: string, role: string) => {
  if (role === 'admin') {
    return { role, menus: null };
  }

  const [rows] = await pool.query(
    `SELECT menu_name, can_access, display_name FROM role_menu_permissions
     WHERE company_id = ? AND role = ?`,
    [companyId, role]
  );

  if (!(rows as any[]).length) {
    return { role, menus: null };
  }

  const menus = (rows as any[])
    .filter((r: any) => r.can_access)
    .map((r: any) => ({ name: r.menu_name, display_name: r.display_name || r.menu_name }));

  return { role, menus };
};

export const getAllPermissions = async (companyId: string) => {
  const [rows] = await pool.query(
    `SELECT role, menu_name, can_access, display_name FROM role_menu_permissions
     WHERE company_id = ? ORDER BY role, menu_name`,
    [companyId]
  );
  return rows as any[];
};

export const upsertPermissions = async (
  companyId: string,
  updates: Array<{ role: string; menu_name: string; can_access: boolean; display_name?: string }>
) => {
  if (!updates.length) return;

  for (const upd of updates) {
    await pool.query(
      `INSERT INTO role_menu_permissions (company_id, role, menu_name, can_access, display_name, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE can_access = VALUES(can_access), display_name = VALUES(display_name), updated_at = NOW()`,
      [companyId, upd.role, upd.menu_name, upd.can_access, upd.display_name || upd.menu_name]
    );
  }
};

// Used by auth.service.ts on company registration
export const seedDefaultPermissions = async (companyId: string, client: Connection) => {
  const adminMenus = ALL_MENUS.map((m) => ({ role: 'admin', ...m, can_access: true, display_name: m.name }));

  const salespersonMenus = [
    { role: 'salesperson', name: 'Dashboard', can_access: true, display_name: 'Dashboard' },
    { role: 'salesperson', name: 'Invoices', can_access: true, display_name: 'Invoices' },
    { role: 'salesperson', name: 'Sales Order', can_access: true, display_name: 'Orders' },
    { role: 'salesperson', name: 'Delivery Notes', can_access: true, display_name: 'Delivery Notes' },
    { role: 'salesperson', name: 'Customer Payments', can_access: true, display_name: 'Customer Payments' },
    { role: 'salesperson', name: 'Customer Center', can_access: true, display_name: 'Customer Center' },
    { role: 'salesperson', name: 'Product Center', can_access: true, display_name: 'Product Center' },
    { role: 'salesperson', name: 'Stock Valuation', can_access: true, display_name: 'Stock Valuation' },
    { role: 'salesperson', name: 'Stock Mobility', can_access: true, display_name: 'Stock Mobility' },
    { role: 'salesperson', name: 'Financial Statements', can_access: true, display_name: 'Financial Statements' },
    { role: 'salesperson', name: 'Revenue & Sales Analysis', can_access: true, display_name: 'Revenue & Sales Analysis' },
  ];

  const customerMenus = [
    { role: 'customer', name: 'Dashboard', can_access: true, display_name: 'Dashboard' },
    { role: 'customer', name: 'Sales Order', can_access: true, display_name: 'Orders' },
    { role: 'customer', name: 'Product Center', can_access: true, display_name: 'Product Center' },
  ];

  const all = [...adminMenus, ...salespersonMenus, ...customerMenus];

  for (const m of all) {
    await client.query(
      `INSERT IGNORE INTO role_menu_permissions (company_id, role, menu_name, can_access, display_name)
       VALUES (?, ?, ?, ?, ?)`,
      [companyId, m.role, m.name, m.can_access, m.display_name]
    );
  }
};
