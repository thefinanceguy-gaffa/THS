import type { UserRole } from "@/lib/supabase/database.types";

export interface NavItem {
  label: string;
  href: string;
  icon: string; // Material Symbols Rounded ligature name
  /** Omit to show to every non-client role. */
  roles?: UserRole[];
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "OVERVIEW",
    items: [{ label: "Dashboard", href: "/dashboard", icon: "dashboard" }],
  },
  {
    label: "SALES & CRM",
    items: [
      { label: "CRM & Leads", href: "/crm", icon: "target", roles: ["owner", "admin", "bus_dev", "ops_manager"] },
      { label: "Quotations", href: "/quotations", icon: "request_quote", roles: ["owner", "admin", "bus_dev", "ops_manager", "finance"] },
      { label: "Site Assessments", href: "/assessments", icon: "fact_check", roles: ["owner", "admin", "bus_dev", "ops_manager"] },
      { label: "Contracts", href: "/contracts", icon: "history_edu", roles: ["owner", "admin", "finance", "bus_dev", "ops_manager"] },
      { label: "Customers", href: "/customers", icon: "domain", roles: ["owner", "admin", "bus_dev", "ops_manager", "finance"] },
    ],
  },
  {
    label: "OPERATIONS",
    items: [
      { label: "Scheduling", href: "/operations", icon: "calendar_month", roles: ["owner", "admin", "ops_manager", "supervisor"] },
      { label: "Supervisor App", href: "/operations/field", icon: "phone_iphone", roles: ["owner", "ops_manager", "supervisor", "cleaner"] },
    ],
  },
  {
    label: "SUPPLY CHAIN",
    items: [
      { label: "Inventory", href: "/inventory", icon: "inventory_2", roles: ["owner", "admin", "procurement", "ops_manager"] },
      { label: "Procurement", href: "/procurement", icon: "shopping_cart", roles: ["owner", "admin", "procurement"] },
      { label: "Suppliers", href: "/suppliers", icon: "local_shipping", roles: ["owner", "procurement", "finance"] },
      { label: "Vehicles", href: "/vehicles", icon: "directions_car", roles: ["owner", "admin", "ops_manager"] },
    ],
  },
  {
    label: "FINANCE",
    items: [
      { label: "Invoicing", href: "/finance/invoices", icon: "receipt_long", roles: ["owner", "finance"] },
      { label: "Payments", href: "/finance/payments", icon: "payments", roles: ["owner", "finance"] },
      { label: "Debtors", href: "/finance/debtors", icon: "trending_down", roles: ["owner", "finance"] },
      { label: "Expenses", href: "/finance/expenses", icon: "receipt", roles: ["owner", "finance"] },
    ],
  },
  {
    label: "PEOPLE",
    items: [{ label: "Human Resources", href: "/hr", icon: "groups", roles: ["owner", "hr"] }],
  },
  {
    label: "GROWTH",
    items: [
      { label: "Marketing", href: "/marketing", icon: "campaign", roles: ["owner", "admin", "bus_dev"] },
      { label: "Client Portal", href: "/portal", icon: "person", roles: ["owner", "admin"] },
    ],
  },
  {
    label: "INTELLIGENCE",
    items: [
      { label: "Reports", href: "/reports", icon: "bar_chart", roles: ["owner", "admin", "finance", "ops_manager", "bus_dev"] },
      { label: "AI Insights", href: "/ai-insights", icon: "auto_awesome", roles: ["owner", "admin", "ops_manager"] },
    ],
  },
  {
    label: "SYSTEM",
    items: [
      { label: "Users & Roles", href: "/administration/users", icon: "manage_accounts", roles: ["owner"] },
      { label: "Audit Logs", href: "/administration/audit-log", icon: "history", roles: ["owner", "admin"] },
      { label: "Settings", href: "/administration/settings", icon: "settings", roles: ["owner", "admin"] },
    ],
  },
];

export function visibleNavGroups(role: UserRole): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.roles || item.roles.includes(role)),
  })).filter((group) => group.items.length > 0);
}
