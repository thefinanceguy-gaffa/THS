import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/supabase/database.types";
import { STAGE_LABELS } from "@/lib/crm/pipeline";

type Supa = Awaited<ReturnType<typeof createClient>>;

export interface ReportColumn {
  key: string;
  label: string;
  align?: "left" | "right";
}

export interface ReportResult {
  columns: ReportColumn[];
  rows: Record<string, string | number>[];
  summary?: { label: string; value: string }[];
  note?: string;
}

export interface ReportDefinition {
  slug: string;
  title: string;
  description: string;
  icon: string;
  roles: UserRole[];
  load: (supabase: Supa) => Promise<ReportResult>;
}

const money = (n: number) => `$${n.toFixed(2)}`;
const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const monthsAgo = (n: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d;
};

export const REPORTS: ReportDefinition[] = [
  {
    slug: "daily-leads",
    title: "Daily Lead Report",
    description: "Every lead created today, with source, stage and owner.",
    icon: "today",
    roles: ["owner", "admin", "bus_dev", "ops_manager"],
    async load(supabase) {
      const since = startOfDay(new Date()).toISOString();
      const { data } = await supabase
        .from("leads")
        .select("company_name, source, stage, score, est_value_usd, created_at, owner:profiles!leads_owner_id_fkey(full_name)")
        .is("deleted_at", null)
        .gte("created_at", since)
        .order("created_at", { ascending: false });
      const rows = (data ?? []).map((l) => ({
        company_name: l.company_name,
        source: l.source,
        stage: STAGE_LABELS[l.stage] ?? l.stage,
        score: l.score,
        est_value_usd: money(l.est_value_usd),
        owner: Array.isArray(l.owner) ? (l.owner[0]?.full_name ?? "—") : ((l.owner as { full_name: string } | null)?.full_name ?? "—"),
        created_at: new Date(l.created_at).toLocaleString(),
      }));
      return {
        columns: [
          { key: "company_name", label: "Company" },
          { key: "source", label: "Source" },
          { key: "stage", label: "Stage" },
          { key: "score", label: "Score" },
          { key: "est_value_usd", label: "Est. Value", align: "right" },
          { key: "owner", label: "Owner" },
          { key: "created_at", label: "Created" },
        ],
        rows,
        summary: [{ label: "New leads today", value: String(rows.length) }],
      };
    },
  },
  {
    slug: "pipeline",
    title: "Pipeline Report",
    description: "Open leads by stage — count, value and average win probability.",
    icon: "target",
    roles: ["owner", "admin", "bus_dev", "ops_manager"],
    async load(supabase) {
      const { data } = await supabase.from("leads").select("stage, est_value_usd, win_probability").is("deleted_at", null);
      const stages = Array.from(new Set((data ?? []).map((l) => l.stage)));
      const rows = stages.map((stage) => {
        const inStage = (data ?? []).filter((l) => l.stage === stage);
        const value = inStage.reduce((s, l) => s + l.est_value_usd, 0);
        const avgProb = inStage.length ? inStage.reduce((s, l) => s + l.win_probability, 0) / inStage.length : 0;
        return { stage: STAGE_LABELS[stage] ?? stage, count: inStage.length, value: money(value), avg_win_probability: `${avgProb.toFixed(0)}%` };
      });
      return {
        columns: [
          { key: "stage", label: "Stage" },
          { key: "count", label: "Leads", align: "right" },
          { key: "value", label: "Pipeline Value", align: "right" },
          { key: "avg_win_probability", label: "Avg. Win Probability", align: "right" },
        ],
        rows,
      };
    },
  },
  {
    slug: "conversion",
    title: "Conversion Report",
    description: "Lead-to-customer conversion rate by source, last 90 days.",
    icon: "trending_up",
    roles: ["owner", "admin", "bus_dev"],
    async load(supabase) {
      const since = monthsAgo(3).toISOString();
      const { data } = await supabase.from("leads").select("source, stage").is("deleted_at", null).gte("created_at", since);
      const sources = Array.from(new Set((data ?? []).map((l) => l.source)));
      const rows = sources.map((source) => {
        const inSource = (data ?? []).filter((l) => l.source === source);
        const won = inSource.filter((l) => l.stage === "won").length;
        const rate = inSource.length ? (won / inSource.length) * 100 : 0;
        return { source, total: inSource.length, won, conversion_rate: `${rate.toFixed(0)}%` };
      });
      const totalWon = (data ?? []).filter((l) => l.stage === "won").length;
      return {
        columns: [
          { key: "source", label: "Source" },
          { key: "total", label: "Total Leads", align: "right" },
          { key: "won", label: "Won", align: "right" },
          { key: "conversion_rate", label: "Conversion Rate", align: "right" },
        ],
        rows,
        summary: [
          { label: "Leads (90d)", value: String((data ?? []).length) },
          { label: "Won", value: String(totalWon) },
        ],
      };
    },
  },
  {
    slug: "jobs-completed",
    title: "Jobs Completed Report",
    description: "Completed jobs by team, last 30 days.",
    icon: "task_alt",
    roles: ["owner", "admin", "ops_manager"],
    async load(supabase) {
      const since = monthsAgo(1).toISOString();
      const { data } = await supabase
        .from("jobs")
        .select("number, service_type, status, scheduled_start, team:teams(name), supervisor:profiles!jobs_supervisor_id_fkey(full_name)")
        .eq("status", "completed")
        .gte("scheduled_start", since)
        .order("scheduled_start", { ascending: false });
      const rows = (data ?? []).map((j) => ({
        number: j.number,
        service_type: j.service_type ?? "—",
        team: Array.isArray(j.team) ? (j.team[0]?.name ?? "—") : ((j.team as { name: string } | null)?.name ?? "—"),
        supervisor: Array.isArray(j.supervisor) ? (j.supervisor[0]?.full_name ?? "—") : ((j.supervisor as { full_name: string } | null)?.full_name ?? "—"),
        scheduled_start: j.scheduled_start ? new Date(j.scheduled_start).toLocaleDateString() : "—",
      }));
      return {
        columns: [
          { key: "number", label: "Job #" },
          { key: "service_type", label: "Service" },
          { key: "team", label: "Team" },
          { key: "supervisor", label: "Supervisor" },
          { key: "scheduled_start", label: "Date" },
        ],
        rows,
        summary: [{ label: "Completed (30d)", value: String(rows.length) }],
      };
    },
  },
  {
    slug: "satisfaction",
    title: "Customer Satisfaction Report",
    description: "Satisfaction score by customer, lowest first.",
    icon: "sentiment_satisfied",
    roles: ["owner", "admin", "ops_manager", "bus_dev"],
    async load(supabase) {
      const { data } = await supabase.from("customers").select("company_name, satisfaction, status").is("deleted_at", null).eq("status", "active").order("satisfaction", { ascending: true, nullsFirst: false });
      const rated = (data ?? []).filter((c) => c.satisfaction !== null);
      const avg = rated.length ? rated.reduce((s, c) => s + (c.satisfaction ?? 0), 0) / rated.length : 0;
      const rows = (data ?? []).map((c) => ({ company_name: c.company_name, satisfaction: c.satisfaction !== null ? `${c.satisfaction}/5` : "Not yet rated" }));
      return {
        columns: [
          { key: "company_name", label: "Customer" },
          { key: "satisfaction", label: "Satisfaction", align: "right" },
        ],
        rows,
        summary: [{ label: "Average (rated)", value: rated.length ? `${avg.toFixed(1)}/5` : "—" }],
      };
    },
  },
  {
    slug: "productivity",
    title: "Productivity Report",
    description: "Job completion rate by supervisor, last 30 days.",
    icon: "bolt",
    roles: ["owner", "admin", "ops_manager"],
    async load(supabase) {
      const since = monthsAgo(1).toISOString();
      const { data } = await supabase.from("jobs").select("status, supervisor:profiles!jobs_supervisor_id_fkey(full_name)").gte("scheduled_start", since).not("supervisor_id", "is", null);
      const bySupervisor = new Map<string, { total: number; completed: number }>();
      for (const j of data ?? []) {
        const name = Array.isArray(j.supervisor) ? (j.supervisor[0]?.full_name ?? "—") : ((j.supervisor as { full_name: string } | null)?.full_name ?? "—");
        const entry = bySupervisor.get(name) ?? { total: 0, completed: 0 };
        entry.total += 1;
        if (j.status === "completed") entry.completed += 1;
        bySupervisor.set(name, entry);
      }
      const rows = Array.from(bySupervisor.entries())
        .map(([name, { total, completed }]) => ({ supervisor: name, assigned: total, completed, completion_rate: total ? `${((completed / total) * 100).toFixed(0)}%` : "—" }))
        .sort((a, b) => b.completed - a.completed);
      return {
        columns: [
          { key: "supervisor", label: "Supervisor" },
          { key: "assigned", label: "Assigned", align: "right" },
          { key: "completed", label: "Completed", align: "right" },
          { key: "completion_rate", label: "Completion Rate", align: "right" },
        ],
        rows,
      };
    },
  },
  {
    slug: "inventory-valuation",
    title: "Inventory Valuation Report",
    description: "Current stock on hand valued at unit cost.",
    icon: "inventory_2",
    roles: ["owner", "admin", "procurement"],
    async load(supabase) {
      const [{ data: items }, { data: movements }] = await Promise.all([
        supabase.from("inventory_items").select("id, name, unit, unit_cost_usd").is("deleted_at", null),
        supabase.from("stock_movements").select("item_id, quantity"),
      ]);
      const onHand = new Map<string, number>();
      for (const m of movements ?? []) onHand.set(m.item_id ?? "", (onHand.get(m.item_id ?? "") ?? 0) + m.quantity);
      const rows = (items ?? []).map((i) => {
        const qty = onHand.get(i.id) ?? 0;
        const value = qty * (i.unit_cost_usd ?? 0);
        return { name: i.name, unit: i.unit ?? "—", qty_on_hand: qty, unit_cost_usd: money(i.unit_cost_usd ?? 0), value_usd: money(value), _value: value };
      });
      const total = rows.reduce((s, r) => s + r._value, 0);
      return {
        columns: [
          { key: "name", label: "Item" },
          { key: "unit", label: "Unit" },
          { key: "qty_on_hand", label: "Qty On Hand", align: "right" },
          { key: "unit_cost_usd", label: "Unit Cost", align: "right" },
          { key: "value_usd", label: "Value", align: "right" },
        ],
        rows: rows.map((r) => ({ name: r.name, unit: r.unit, qty_on_hand: r.qty_on_hand, unit_cost_usd: r.unit_cost_usd, value_usd: r.value_usd })),
        summary: [{ label: "Total inventory value", value: money(total) }],
      };
    },
  },
  {
    slug: "debtors",
    title: "Debtors Aging Report",
    description: "Outstanding invoice balances by age bucket.",
    icon: "trending_down",
    roles: ["owner", "finance"],
    async load(supabase) {
      const { data } = await supabase
        .from("invoices")
        .select("number, total_usd, due_on, customers(company_name), payments(amount_usd)")
        .in("status", ["sent", "part_paid", "overdue"])
        .is("deleted_at", null);
      const now = Date.now();
      const rows = (data ?? [])
        .map((inv) => {
          const paid = (inv.payments ?? []).reduce((s, p) => s + (p.amount_usd ?? 0), 0);
          const balance = inv.total_usd - paid;
          const daysOverdue = inv.due_on ? Math.floor((now - new Date(inv.due_on).getTime()) / 86_400_000) : 0;
          const bucket = daysOverdue <= 0 ? "Current" : daysOverdue <= 30 ? "1–30 days" : daysOverdue <= 60 ? "31–60 days" : daysOverdue <= 90 ? "61–90 days" : "90+ days";
          const company = Array.isArray(inv.customers) ? (inv.customers[0]?.company_name ?? "—") : (inv.customers as { company_name: string } | null)?.company_name ?? "—";
          return { number: inv.number, customer: company, balance_usd: money(balance), bucket, _balance: balance };
        })
        .filter((r) => r._balance > 0)
        .sort((a, b) => b._balance - a._balance);
      const total = rows.reduce((s, r) => s + r._balance, 0);
      return {
        columns: [
          { key: "number", label: "Invoice #" },
          { key: "customer", label: "Customer" },
          { key: "bucket", label: "Age" },
          { key: "balance_usd", label: "Balance", align: "right" },
        ],
        rows: rows.map((r) => ({ number: r.number, customer: r.customer, balance_usd: r.balance_usd, bucket: r.bucket })),
        summary: [{ label: "Total outstanding", value: money(total) }],
      };
    },
  },
  {
    slug: "profitability",
    title: "Monthly Profitability Report",
    description: "Revenue collected vs. expenses, last 6 months.",
    icon: "account_balance",
    roles: ["owner", "finance"],
    async load(supabase) {
      const since = monthsAgo(6);
      const [{ data: payments }, { data: expenses }] = await Promise.all([
        supabase.from("payments").select("amount_usd, paid_at").gte("paid_at", since.toISOString()),
        supabase.from("expenses").select("amount_usd, incurred_on").is("deleted_at", null).gte("incurred_on", since.toISOString().slice(0, 10)),
      ]);
      const rows = Array.from({ length: 6 }, (_, i) => {
        const monthStart = new Date();
        monthStart.setMonth(monthStart.getMonth() - (5 - i), 1);
        monthStart.setHours(0, 0, 0, 0);
        const monthEnd = new Date(monthStart);
        monthEnd.setMonth(monthEnd.getMonth() + 1);
        const revenue = (payments ?? []).filter((p) => new Date(p.paid_at) >= monthStart && new Date(p.paid_at) < monthEnd).reduce((s, p) => s + (p.amount_usd ?? 0), 0);
        const spend = (expenses ?? []).filter((e) => new Date(e.incurred_on) >= monthStart && new Date(e.incurred_on) < monthEnd).reduce((s, e) => s + e.amount_usd, 0);
        return {
          month: monthStart.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
          revenue_usd: money(revenue),
          expenses_usd: money(spend),
          profit_usd: money(revenue - spend),
        };
      });
      return {
        columns: [
          { key: "month", label: "Month" },
          { key: "revenue_usd", label: "Revenue", align: "right" },
          { key: "expenses_usd", label: "Expenses", align: "right" },
          { key: "profit_usd", label: "Profit", align: "right" },
        ],
        rows,
      };
    },
  },
  {
    slug: "branch-performance",
    title: "Branch Performance Report",
    description: "Revenue and active jobs by branch, last 30 days.",
    icon: "store",
    roles: ["owner", "admin"],
    async load(supabase) {
      const since = monthsAgo(1).toISOString();
      const [{ data: branches }, { data: customers }, { data: payments }, { data: jobs }] = await Promise.all([
        supabase.from("branches").select("id, name").is("deleted_at", null),
        supabase.from("customers").select("id, branch_id").is("deleted_at", null),
        supabase.from("payments").select("customer_id, amount_usd").gte("paid_at", since),
        supabase.from("jobs").select("customer_id, status").gte("scheduled_start", since),
      ]);
      const rows = (branches ?? []).map((b) => {
        const branchCustomerIds = new Set((customers ?? []).filter((c) => c.branch_id === b.id).map((c) => c.id));
        const revenue = (payments ?? []).filter((p) => p.customer_id && branchCustomerIds.has(p.customer_id)).reduce((s, p) => s + (p.amount_usd ?? 0), 0);
        const jobCount = (jobs ?? []).filter((j) => j.customer_id && branchCustomerIds.has(j.customer_id)).length;
        return { branch: b.name, revenue_usd: money(revenue), jobs_30d: jobCount };
      });
      return {
        columns: [
          { key: "branch", label: "Branch" },
          { key: "revenue_usd", label: "Revenue (30d)", align: "right" },
          { key: "jobs_30d", label: "Jobs (30d)", align: "right" },
        ],
        rows,
      };
    },
  },
  {
    slug: "executive",
    title: "Executive Summary",
    description: "Top-line KPIs across every module, at a glance.",
    icon: "insights",
    roles: ["owner"],
    async load(supabase) {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const [{ data: payments }, { data: leads }, { data: contracts }, { data: openInvoices }, { data: jobs }, { data: customers }, { data: profiles }] = await Promise.all([
        supabase.from("payments").select("amount_usd").gte("paid_at", startOfMonth.toISOString()),
        supabase.from("leads").select("stage, est_value_usd").is("deleted_at", null),
        supabase.from("contracts").select("monthly_usd").eq("status", "active").is("deleted_at", null),
        supabase.from("invoices").select("total_usd, payments(amount_usd)").in("status", ["sent", "part_paid", "overdue"]).is("deleted_at", null),
        supabase.from("jobs").select("status").gte("scheduled_start", startOfMonth.toISOString()),
        supabase.from("customers").select("satisfaction").is("deleted_at", null).not("satisfaction", "is", null),
        supabase.from("profiles").select("id").eq("is_active", true).is("deleted_at", null),
      ]);
      const revenueMtd = (payments ?? []).reduce((s, p) => s + (p.amount_usd ?? 0), 0);
      const pipelineValue = (leads ?? []).filter((l) => l.stage !== "won" && l.stage !== "lost").reduce((s, l) => s + l.est_value_usd, 0);
      const recurringMonthly = (contracts ?? []).reduce((s, c) => s + (c.monthly_usd ?? 0), 0);
      const outstanding = (openInvoices ?? []).reduce((s, i) => s + i.total_usd - (i.payments ?? []).reduce((ps, p) => ps + (p.amount_usd ?? 0), 0), 0);
      const jobsCompleted = (jobs ?? []).filter((j) => j.status === "completed").length;
      const avgSatisfaction = customers && customers.length ? customers.reduce((s, c) => s + (c.satisfaction ?? 0), 0) / customers.length : 0;
      return {
        columns: [
          { key: "metric", label: "Metric" },
          { key: "value", label: "Value", align: "right" },
        ],
        rows: [
          { metric: "Revenue (MTD)", value: money(revenueMtd) },
          { metric: "Recurring monthly value", value: money(recurringMonthly) },
          { metric: "Pipeline value (open)", value: money(pipelineValue) },
          { metric: "Outstanding debtors", value: money(outstanding) },
          { metric: "Jobs completed (MTD)", value: String(jobsCompleted) },
          { metric: "Average customer satisfaction", value: avgSatisfaction ? `${avgSatisfaction.toFixed(1)}/5` : "—" },
          { metric: "Active staff", value: String((profiles ?? []).length) },
        ],
      };
    },
  },
];

export function getReport(slug: string): ReportDefinition | undefined {
  return REPORTS.find((r) => r.slug === slug);
}
