import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type { Database, UserRole } from "@/lib/supabase/database.types";

type Supa = Awaited<ReturnType<typeof createClient>>;
export type SoftDeletableTable = keyof Database["public"]["Tables"];

export interface DeletedRecord {
  id: string;
  label: string;
  deletedAt: string;
}

export interface RecycleBinEntity {
  table: SoftDeletableTable;
  entityLabel: string;
  /** Roles allowed to restore — must match the table's UPDATE RLS policy or restore will fail silently. */
  roles: UserRole[];
  labelColumn: string;
  load: (supabase: Supa) => Promise<DeletedRecord[]>;
  restore: (supabase: Supa, id: string) => Promise<{ error: string | null }>;
}

function simple<T extends SoftDeletableTable>(
  table: T,
  entityLabel: string,
  roles: UserRole[],
  labelColumn: string,
  labelFn: (row: Record<string, string | null>) => string,
): RecycleBinEntity {
  return {
    table,
    entityLabel,
    roles,
    labelColumn,
    async load(supabase) {
      const { data } = await supabase.from(table).select(`id, ${labelColumn}, deleted_at`).not("deleted_at", "is", null).order("deleted_at", { ascending: false }).limit(100);
      return ((data ?? []) as unknown as Record<string, string | null>[]).map((row) => ({
        id: row.id as string,
        label: labelFn(row),
        deletedAt: row.deleted_at as string,
      }));
    },
    async restore(supabase, id) {
      const { error } = await restoreByTable(supabase, table, id);
      return { error: error?.message ?? null };
    },
  };
}

/** Explicit per-table calls — a generic `.from(table).update(...)` over a union table-name type parameter does not narrow correctly against supabase-js's typed client, so each table is dispatched to its own literal `.from()` call instead. */
function restoreByTable(supabase: Supa, table: SoftDeletableTable, id: string) {
  switch (table) {
    case "customers":
      return supabase.from("customers").update({ deleted_at: null }).eq("id", id);
    case "leads":
      return supabase.from("leads").update({ deleted_at: null }).eq("id", id);
    case "quotations":
      return supabase.from("quotations").update({ deleted_at: null }).eq("id", id);
    case "site_assessments":
      return supabase.from("site_assessments").update({ deleted_at: null }).eq("id", id);
    case "jobs":
      return supabase.from("jobs").update({ deleted_at: null }).eq("id", id);
    case "contracts":
      return supabase.from("contracts").update({ deleted_at: null }).eq("id", id);
    case "invoices":
      return supabase.from("invoices").update({ deleted_at: null }).eq("id", id);
    case "suppliers":
      return supabase.from("suppliers").update({ deleted_at: null }).eq("id", id);
    case "inventory_items":
      return supabase.from("inventory_items").update({ deleted_at: null }).eq("id", id);
    case "employee_records":
      return supabase.from("employee_records").update({ deleted_at: null }).eq("id", id);
    case "expenses":
      return supabase.from("expenses").update({ deleted_at: null }).eq("id", id);
    case "campaigns":
      return supabase.from("campaigns").update({ deleted_at: null }).eq("id", id);
    default:
      throw new Error(`No restore handler registered for table "${table}".`);
  }
}

export const RECYCLE_BIN_ENTITIES: RecycleBinEntity[] = [
  simple("customers", "Customer", ["owner", "admin", "bus_dev", "ops_manager"], "company_name", (r) => r.company_name ?? "—"),
  simple("leads", "Lead", ["owner", "admin", "ops_manager"], "company_name", (r) => r.company_name ?? "—"),
  simple("quotations", "Quotation", ["owner", "admin", "ops_manager"], "number", (r) => r.number ?? "—"),
  simple("site_assessments", "Site Assessment", ["owner", "admin", "bus_dev", "ops_manager"], "reference", (r) => r.reference ?? "—"),
  simple("jobs", "Job", ["owner", "admin", "ops_manager"], "number", (r) => r.number ?? "—"),
  simple("contracts", "Contract", ["owner", "finance"], "number", (r) => r.number ?? "—"),
  simple("invoices", "Invoice", ["owner", "finance"], "number", (r) => r.number ?? "—"),
  simple("suppliers", "Supplier", ["owner", "procurement"], "name", (r) => r.name ?? "—"),
  simple("inventory_items", "Inventory Item", ["owner", "admin", "procurement"], "name", (r) => r.name ?? "—"),
  simple("employee_records", "Employee Record", ["owner", "hr"], "title", (r) => r.title ?? "—"),
  simple("expenses", "Expense", ["owner", "finance"], "category", (r) => r.category ?? "—"),
  simple("campaigns", "Campaign", ["owner", "admin", "bus_dev"], "name", (r) => r.name ?? "—"),
];

export function getEntity(table: string): RecycleBinEntity | undefined {
  return RECYCLE_BIN_ENTITIES.find((e) => e.table === (table as SoftDeletableTable));
}
