/**
 * Hand-written mirror of the Supabase schema (supabase/migrations/*.sql).
 *
 * In a deployed environment, regenerate this from the live database with:
 *   npm run db:types
 * (requires the Supabase CLI linked to your project — see docs/DEVELOPER.md)
 *
 * Keeping a hand-written version in the repo means the app builds and
 * type-checks even before a Supabase project exists.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = "owner" | "admin" | "bus_dev" | "ops_manager" | "supervisor" | "cleaner" | "finance" | "procurement" | "hr" | "client";
export type LeadStage = "new" | "contacted" | "qualified" | "site_visit" | "quotation" | "negotiation" | "won" | "lost" | "onboarding" | "active" | "repeat";
export type LeadSource =
  | "whatsapp"
  | "website"
  | "facebook"
  | "instagram"
  | "linkedin"
  | "google_business"
  | "referral"
  | "walk_in"
  | "qr_code"
  | "phone"
  | "email"
  | "google_form"
  | "tender"
  | "cold_call"
  | "networking_event"
  | "ai_prospecting";
export type QuoteStatus = "draft" | "pending_review" | "pending_owner" | "sent" | "negotiation" | "awaiting_client" | "accepted" | "rejected" | "expired";
export type JobStatus = "scheduled" | "en_route" | "in_progress" | "completed" | "cancelled";
export type InvoiceStatus = "draft" | "sent" | "part_paid" | "paid" | "overdue" | "cancelled";
export type ApprovalStatus = "pending" | "approved" | "rejected";
export type CurrencyCode = "USD" | "ZIG";

export interface Database {
  public: {
    Tables: {
      branches: {
        Row: {
          id: string;
          name: string;
          city: string | null;
          is_main: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["branches"]["Row"]> & { name: string };
        Update: Partial<Database["public"]["Tables"]["branches"]["Row"]>;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string;
          role: UserRole;
          branch_id: string | null;
          reporting_manager_id: string | null;
          job_title: string | null;
          department: string | null;
          approval_limit_usd: number;
          phone: string | null;
          customer_id: string | null;
          is_active: boolean;
          is_suspended: boolean;
          two_factor_enabled: boolean;
          default_landing_page: string;
          last_login_at: string | null;
          failed_login_count: number;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & { id: string; full_name: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [
          { foreignKeyName: "profiles_branch_id_fkey"; columns: ["branch_id"]; isOneToOne: false; referencedRelation: "branches"; referencedColumns: ["id"] },
          { foreignKeyName: "profiles_reporting_manager_id_fkey"; columns: ["reporting_manager_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "profiles_customer_id_fkey"; columns: ["customer_id"]; isOneToOne: false; referencedRelation: "customers"; referencedColumns: ["id"] }
        ];
      };
      permission_overrides: {
        Row: { id: string; profile_id: string; permission_key: string; allowed: boolean; created_at: string };
        Insert: Partial<Database["public"]["Tables"]["permission_overrides"]["Row"]> & { profile_id: string; permission_key: string; allowed: boolean };
        Update: Partial<Database["public"]["Tables"]["permission_overrides"]["Row"]>;
        Relationships: [{ foreignKeyName: "permission_overrides_profile_id_fkey"; columns: ["profile_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }];
      };
      document_counters: {
        Row: { counter_type: string; current_value: number };
        Insert: { counter_type: string; current_value?: number };
        Update: Partial<{ counter_type: string; current_value: number }>;
        Relationships: [];
      };
      customers: {
        Row: {
          id: string;
          company_name: string;
          industry: string | null;
          suburb: string | null;
          address: string | null;
          segment: string | null;
          account_owner_id: string | null;
          branch_id: string | null;
          monthly_value_usd: number;
          satisfaction: number | null;
          status: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["customers"]["Row"]> & { company_name: string };
        Update: Partial<Database["public"]["Tables"]["customers"]["Row"]>;
        Relationships: [
          { foreignKeyName: "customers_account_owner_id_fkey"; columns: ["account_owner_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "customers_branch_id_fkey"; columns: ["branch_id"]; isOneToOne: false; referencedRelation: "branches"; referencedColumns: ["id"] }
        ];
      };
      contacts: {
        Row: {
          id: string;
          customer_id: string | null;
          full_name: string;
          role_title: string | null;
          phone: string | null;
          email: string | null;
          is_primary: boolean;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["contacts"]["Row"]> & { full_name: string };
        Update: Partial<Database["public"]["Tables"]["contacts"]["Row"]>;
        Relationships: [{ foreignKeyName: "contacts_customer_id_fkey"; columns: ["customer_id"]; isOneToOne: false; referencedRelation: "customers"; referencedColumns: ["id"] }];
      };
      leads: {
        Row: {
          id: string;
          company_name: string;
          contact_name: string | null;
          contact_role: string | null;
          phone: string | null;
          email: string | null;
          industry: string | null;
          suburb: string | null;
          company_size: string | null;
          service_required: string | null;
          source: LeadSource;
          stage: LeadStage;
          score: string;
          est_value_usd: number;
          win_probability: number;
          owner_id: string | null;
          customer_id: string | null;
          last_contacted_at: string | null;
          next_followup_at: string | null;
          ai_recommendation: string | null;
          bant_budget: string;
          bant_authority: string;
          bant_need: string;
          bant_timeline: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          created_by: string | null;
          updated_by: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["leads"]["Row"]> & { company_name: string; source: LeadSource };
        Update: Partial<Database["public"]["Tables"]["leads"]["Row"]>;
        Relationships: [
          { foreignKeyName: "leads_owner_id_fkey"; columns: ["owner_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "leads_customer_id_fkey"; columns: ["customer_id"]; isOneToOne: false; referencedRelation: "customers"; referencedColumns: ["id"] }
        ];
      };
      prospect_candidates: {
        Row: {
          id: string;
          company_name: string;
          suburb: string | null;
          industry: string | null;
          source: string;
          source_ref: string | null;
          estimated_value_usd: number | null;
          fit_score: number | null;
          fit_reason: string | null;
          suppressed: boolean;
          converted_lead_id: string | null;
          collected_at: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["prospect_candidates"]["Row"]> & { company_name: string; source: string };
        Update: Partial<Database["public"]["Tables"]["prospect_candidates"]["Row"]>;
        Relationships: [{ foreignKeyName: "prospect_candidates_converted_lead_id_fkey"; columns: ["converted_lead_id"]; isOneToOne: false; referencedRelation: "leads"; referencedColumns: ["id"] }];
      };
      suppression_list: {
        Row: { id: string; company_name: string | null; email: string | null; phone: string | null; reason: string | null; added_by: string | null; created_at: string };
        Insert: Partial<Database["public"]["Tables"]["suppression_list"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["suppression_list"]["Row"]>;
        Relationships: [];
      };
      communications: {
        Row: {
          id: string;
          lead_id: string | null;
          customer_id: string | null;
          channel: string;
          direction: string;
          title: string | null;
          note: string | null;
          client_response: string | null;
          logged_by: string | null;
          occurred_at: string;
          created_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["communications"]["Row"]> & { channel: string; direction: string };
        Update: Partial<Database["public"]["Tables"]["communications"]["Row"]>;
        Relationships: [
          { foreignKeyName: "communications_lead_id_fkey"; columns: ["lead_id"]; isOneToOne: false; referencedRelation: "leads"; referencedColumns: ["id"] },
          { foreignKeyName: "communications_customer_id_fkey"; columns: ["customer_id"]; isOneToOne: false; referencedRelation: "customers"; referencedColumns: ["id"] }
        ];
      };
      site_assessments: {
        Row: {
          id: string;
          reference: string | null;
          lead_id: string | null;
          customer_id: string | null;
          site_name: string;
          suburb: string | null;
          assessor_id: string | null;
          scheduled_at: string | null;
          completed_at: string | null;
          total_area_m2: number | null;
          recommended_crew: string | null;
          service_window: string | null;
          est_monthly_usd: number | null;
          risks: string | null;
          status: string;
          version: number;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["site_assessments"]["Row"]> & { site_name: string };
        Update: Partial<Database["public"]["Tables"]["site_assessments"]["Row"]>;
        Relationships: [
          { foreignKeyName: "site_assessments_lead_id_fkey"; columns: ["lead_id"]; isOneToOne: false; referencedRelation: "leads"; referencedColumns: ["id"] },
          { foreignKeyName: "site_assessments_customer_id_fkey"; columns: ["customer_id"]; isOneToOne: false; referencedRelation: "customers"; referencedColumns: ["id"] },
          { foreignKeyName: "site_assessments_assessor_id_fkey"; columns: ["assessor_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }
        ];
      };
      assessment_areas: {
        Row: { id: string; assessment_id: string | null; area_name: string | null; size_m2: number | null; surface: string | null; frequency: string | null; effort: string | null };
        Insert: Partial<Database["public"]["Tables"]["assessment_areas"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["assessment_areas"]["Row"]>;
        Relationships: [{ foreignKeyName: "assessment_areas_assessment_id_fkey"; columns: ["assessment_id"]; isOneToOne: false; referencedRelation: "site_assessments"; referencedColumns: ["id"] }];
      };
      quotations: {
        Row: {
          id: string;
          number: string;
          customer_id: string | null;
          lead_id: string | null;
          assessment_id: string | null;
          service_summary: string | null;
          status: QuoteStatus;
          currency: CurrencyCode;
          subtotal_usd: number;
          discount_percent: number;
          vat_usd: number;
          total_usd: number;
          valid_until: string | null;
          version: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["quotations"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["quotations"]["Row"]>;
        Relationships: [
          { foreignKeyName: "quotations_customer_id_fkey"; columns: ["customer_id"]; isOneToOne: false; referencedRelation: "customers"; referencedColumns: ["id"] },
          { foreignKeyName: "quotations_lead_id_fkey"; columns: ["lead_id"]; isOneToOne: false; referencedRelation: "leads"; referencedColumns: ["id"] },
          { foreignKeyName: "quotations_assessment_id_fkey"; columns: ["assessment_id"]; isOneToOne: false; referencedRelation: "site_assessments"; referencedColumns: ["id"] }
        ];
      };
      quotation_lines: {
        Row: { id: string; quotation_id: string | null; description: string; quantity: number; unit: string | null; rate_usd: number; line_no: number };
        Insert: Partial<Database["public"]["Tables"]["quotation_lines"]["Row"]> & { description: string };
        Update: Partial<Database["public"]["Tables"]["quotation_lines"]["Row"]>;
        Relationships: [{ foreignKeyName: "quotation_lines_quotation_id_fkey"; columns: ["quotation_id"]; isOneToOne: false; referencedRelation: "quotations"; referencedColumns: ["id"] }];
      };
      approvals: {
        Row: {
          id: string;
          entity_type: string;
          entity_id: string;
          requested_by: string | null;
          approver_id: string | null;
          status: ApprovalStatus;
          reason: string | null;
          threshold_note: string | null;
          decided_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["approvals"]["Row"]> & { entity_type: string; entity_id: string };
        Update: Partial<Database["public"]["Tables"]["approvals"]["Row"]>;
        Relationships: [
          { foreignKeyName: "approvals_requested_by_fkey"; columns: ["requested_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "approvals_approver_id_fkey"; columns: ["approver_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }
        ];
      };
      teams: {
        Row: { id: string; name: string; leader_id: string | null; branch_id: string | null; created_at: string; deleted_at: string | null };
        Insert: Partial<Database["public"]["Tables"]["teams"]["Row"]> & { name: string };
        Update: Partial<Database["public"]["Tables"]["teams"]["Row"]>;
        Relationships: [
          { foreignKeyName: "teams_leader_id_fkey"; columns: ["leader_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "teams_branch_id_fkey"; columns: ["branch_id"]; isOneToOne: false; referencedRelation: "branches"; referencedColumns: ["id"] }
        ];
      };
      jobs: {
        Row: {
          id: string;
          number: string;
          customer_id: string | null;
          contract_id: string | null;
          site_address: string | null;
          suburb: string | null;
          service_type: string | null;
          team_id: string | null;
          supervisor_id: string | null;
          status: JobStatus;
          priority: string;
          scheduled_start: string | null;
          scheduled_end: string | null;
          progress: number;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["jobs"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["jobs"]["Row"]>;
        Relationships: [
          { foreignKeyName: "jobs_customer_id_fkey"; columns: ["customer_id"]; isOneToOne: false; referencedRelation: "customers"; referencedColumns: ["id"] },
          { foreignKeyName: "jobs_contract_fk"; columns: ["contract_id"]; isOneToOne: false; referencedRelation: "contracts"; referencedColumns: ["id"] },
          { foreignKeyName: "jobs_team_id_fkey"; columns: ["team_id"]; isOneToOne: false; referencedRelation: "teams"; referencedColumns: ["id"] },
          { foreignKeyName: "jobs_supervisor_id_fkey"; columns: ["supervisor_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }
        ];
      };
      job_events: {
        Row: {
          id: string;
          job_id: string | null;
          type: string;
          payload: Json | null;
          gps_lat: number | null;
          gps_lng: number | null;
          captured_by: string | null;
          captured_at: string;
          synced_at: string | null;
          client_generated_id: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["job_events"]["Row"]> & { type: string };
        Update: Partial<Database["public"]["Tables"]["job_events"]["Row"]>;
        Relationships: [{ foreignKeyName: "job_events_job_id_fkey"; columns: ["job_id"]; isOneToOne: false; referencedRelation: "jobs"; referencedColumns: ["id"] }];
      };
      inventory_items: {
        Row: {
          id: string;
          code: string | null;
          name: string;
          category: string | null;
          unit: string | null;
          unit_cost_usd: number | null;
          reorder_level: number | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["inventory_items"]["Row"]> & { name: string };
        Update: Partial<Database["public"]["Tables"]["inventory_items"]["Row"]>;
        Relationships: [];
      };
      stock_locations: {
        Row: { id: string; name: string | null; branch_id: string | null };
        Insert: Partial<Database["public"]["Tables"]["stock_locations"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["stock_locations"]["Row"]>;
        Relationships: [{ foreignKeyName: "stock_locations_branch_id_fkey"; columns: ["branch_id"]; isOneToOne: false; referencedRelation: "branches"; referencedColumns: ["id"] }];
      };
      stock_movements: {
        Row: {
          id: string;
          item_id: string | null;
          location_id: string | null;
          type: string;
          quantity: number;
          reference: string | null;
          job_id: string | null;
          created_by: string | null;
          approved_by: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["stock_movements"]["Row"]> & { type: string; quantity: number };
        Update: Partial<Database["public"]["Tables"]["stock_movements"]["Row"]>;
        Relationships: [
          { foreignKeyName: "stock_movements_item_id_fkey"; columns: ["item_id"]; isOneToOne: false; referencedRelation: "inventory_items"; referencedColumns: ["id"] },
          { foreignKeyName: "stock_movements_location_id_fkey"; columns: ["location_id"]; isOneToOne: false; referencedRelation: "stock_locations"; referencedColumns: ["id"] },
          { foreignKeyName: "stock_movements_job_id_fkey"; columns: ["job_id"]; isOneToOne: false; referencedRelation: "jobs"; referencedColumns: ["id"] }
        ];
      };
      suppliers: {
        Row: {
          id: string;
          name: string;
          category: string | null;
          suburb: string | null;
          rating: number | null;
          payment_terms: string | null;
          status: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["suppliers"]["Row"]> & { name: string };
        Update: Partial<Database["public"]["Tables"]["suppliers"]["Row"]>;
        Relationships: [];
      };
      purchase_orders: {
        Row: {
          id: string;
          number: string;
          supplier_id: string | null;
          amount_usd: number | null;
          status: string;
          raised_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["purchase_orders"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["purchase_orders"]["Row"]>;
        Relationships: [{ foreignKeyName: "purchase_orders_supplier_id_fkey"; columns: ["supplier_id"]; isOneToOne: false; referencedRelation: "suppliers"; referencedColumns: ["id"] }];
      };
      vehicles: {
        Row: {
          id: string;
          name: string | null;
          registration: string | null;
          kind: string | null;
          year: number | null;
          assigned_team_id: string | null;
          mileage_km: number | null;
          status: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["vehicles"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["vehicles"]["Row"]>;
        Relationships: [{ foreignKeyName: "vehicles_assigned_team_id_fkey"; columns: ["assigned_team_id"]; isOneToOne: false; referencedRelation: "teams"; referencedColumns: ["id"] }];
      };
      contracts: {
        Row: {
          id: string;
          number: string;
          customer_id: string | null;
          service_type: string | null;
          monthly_usd: number | null;
          term_months: number | null;
          starts_on: string | null;
          renews_on: string | null;
          auto_renew: boolean;
          status: string;
          version: number;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["contracts"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["contracts"]["Row"]>;
        Relationships: [{ foreignKeyName: "contracts_customer_id_fkey"; columns: ["customer_id"]; isOneToOne: false; referencedRelation: "customers"; referencedColumns: ["id"] }];
      };
      invoices: {
        Row: {
          id: string;
          number: string;
          customer_id: string | null;
          contract_id: string | null;
          currency: CurrencyCode;
          subtotal_usd: number;
          vat_usd: number;
          total_usd: number;
          status: InvoiceStatus;
          issued_on: string | null;
          due_on: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["invoices"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["invoices"]["Row"]>;
        Relationships: [
          { foreignKeyName: "invoices_customer_id_fkey"; columns: ["customer_id"]; isOneToOne: false; referencedRelation: "customers"; referencedColumns: ["id"] },
          { foreignKeyName: "invoices_contract_id_fkey"; columns: ["contract_id"]; isOneToOne: false; referencedRelation: "contracts"; referencedColumns: ["id"] }
        ];
      };
      invoice_lines: {
        Row: { id: string; invoice_id: string | null; description: string | null; quantity: number | null; unit: string | null; rate_usd: number | null; line_no: number };
        Insert: Partial<Database["public"]["Tables"]["invoice_lines"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["invoice_lines"]["Row"]>;
        Relationships: [{ foreignKeyName: "invoice_lines_invoice_id_fkey"; columns: ["invoice_id"]; isOneToOne: false; referencedRelation: "invoices"; referencedColumns: ["id"] }];
      };
      payments: {
        Row: {
          id: string;
          receipt_number: string | null;
          invoice_id: string | null;
          customer_id: string | null;
          amount_usd: number | null;
          currency: CurrencyCode;
          method: string | null;
          allocated: boolean;
          recorded_by: string | null;
          paid_at: string;
          created_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["payments"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["payments"]["Row"]>;
        Relationships: [
          { foreignKeyName: "payments_invoice_id_fkey"; columns: ["invoice_id"]; isOneToOne: false; referencedRelation: "invoices"; referencedColumns: ["id"] },
          { foreignKeyName: "payments_customer_id_fkey"; columns: ["customer_id"]; isOneToOne: false; referencedRelation: "customers"; referencedColumns: ["id"] }
        ];
      };
      employee_records: {
        Row: {
          id: string;
          profile_id: string | null;
          type: string;
          title: string | null;
          detail: string | null;
          status: string | null;
          effective_on: string | null;
          expires_on: string | null;
          created_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["employee_records"]["Row"]> & { type: string };
        Update: Partial<Database["public"]["Tables"]["employee_records"]["Row"]>;
        Relationships: [{ foreignKeyName: "employee_records_profile_id_fkey"; columns: ["profile_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }];
      };
      notifications: {
        Row: { id: string; profile_id: string | null; channel: string; title: string | null; body: string | null; link: string | null; is_read: boolean; created_at: string };
        Insert: Partial<Database["public"]["Tables"]["notifications"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["notifications"]["Row"]>;
        Relationships: [{ foreignKeyName: "notifications_profile_id_fkey"; columns: ["profile_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] }];
      };
      audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          actor_name: string | null;
          actor_role: UserRole | null;
          actor_department: string | null;
          action: string;
          module: string | null;
          entity_type: string | null;
          entity_id: string | null;
          previous_value: Json | null;
          new_value: Json | null;
          reason: string | null;
          approval_ref: string | null;
          ip_address: string | null;
          device_type: string | null;
          browser: string | null;
          location: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["audit_logs"]["Row"]> & { action: string };
        Update: Partial<Database["public"]["Tables"]["audit_logs"]["Row"]>;
        Relationships: [{ foreignKeyName: "audit_logs_approval_ref_fkey"; columns: ["approval_ref"]; isOneToOne: false; referencedRelation: "approvals"; referencedColumns: ["id"] }];
      };
      expenses: {
        Row: {
          id: string;
          category: string;
          description: string | null;
          amount_usd: number;
          branch_id: string | null;
          incurred_on: string;
          recorded_by: string | null;
          created_at: string;
          deleted_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["expenses"]["Row"]> & { category: string; amount_usd: number };
        Update: Partial<Database["public"]["Tables"]["expenses"]["Row"]>;
        Relationships: [{ foreignKeyName: "expenses_branch_id_fkey"; columns: ["branch_id"]; isOneToOne: false; referencedRelation: "branches"; referencedColumns: ["id"] }];
      };
    };
    Views: Record<string, never>;
    Functions: {
      current_user_role: { Args: Record<string, never>; Returns: UserRole };
      is_owner: { Args: Record<string, never>; Returns: boolean };
      is_owner_or_admin: { Args: Record<string, never>; Returns: boolean };
      is_self_or_manager_of: { Args: { p_profile_id: string }; Returns: boolean };
      get_override: { Args: { p_key: string }; Returns: boolean | null };
      next_document_number: { Args: { p_counter_type: string; p_prefix: string }; Returns: string };
      log_audit_event: {
        Args: {
          p_action: string;
          p_module?: string | null;
          p_entity_type?: string | null;
          p_entity_id?: string | null;
          p_reason?: string | null;
          p_device_type?: string | null;
          p_browser?: string | null;
        };
        Returns: void;
      };
      profile_id_for_email: {
        Args: { p_email: string };
        Returns: { id: string; is_suspended: boolean; failed_login_count: number }[];
      };
      record_failed_login: { Args: { p_email: string; p_max_attempts?: number }; Returns: void };
      record_successful_login: { Args: Record<string, never>; Returns: void };
      update_lead_stage: { Args: { p_lead_id: string; p_stage: LeadStage }; Returns: Database["public"]["Tables"]["leads"]["Row"] };
      log_communication: {
        Args: {
          p_lead_id?: string | null;
          p_customer_id?: string | null;
          p_channel?: string;
          p_direction?: string;
          p_title?: string | null;
          p_note?: string | null;
          p_client_response?: string | null;
          p_next_followup_at?: string | null;
        };
        Returns: Database["public"]["Tables"]["communications"]["Row"];
      };
      convert_lead_to_customer: { Args: { p_lead_id: string }; Returns: Database["public"]["Tables"]["customers"]["Row"] };
      create_quotation: {
        Args: {
          p_customer_id: string | null;
          p_lead_id: string | null;
          p_assessment_id: string | null;
          p_service_summary: string | null;
          p_discount_percent: number;
          p_valid_until: string | null;
          p_lines: Json;
        };
        Returns: Database["public"]["Tables"]["quotations"]["Row"];
      };
      submit_quotation: { Args: { p_quotation_id: string }; Returns: Database["public"]["Tables"]["quotations"]["Row"] };
      decide_quotation_approval: { Args: { p_quotation_id: string; p_approve: boolean; p_reason?: string | null }; Returns: Database["public"]["Tables"]["quotations"]["Row"] };
      set_quotation_status: { Args: { p_quotation_id: string; p_status: QuoteStatus }; Returns: Database["public"]["Tables"]["quotations"]["Row"] };
      create_site_assessment: {
        Args: {
          p_customer_id: string | null;
          p_lead_id: string | null;
          p_site_name: string;
          p_suburb: string | null;
          p_assessor_id: string | null;
          p_scheduled_at: string | null;
          p_recommended_crew: string | null;
          p_service_window: string | null;
          p_est_monthly_usd: number | null;
          p_risks: string | null;
          p_areas: Json;
        };
        Returns: Database["public"]["Tables"]["site_assessments"]["Row"];
      };
      complete_site_assessment: { Args: { p_assessment_id: string }; Returns: Database["public"]["Tables"]["site_assessments"]["Row"] };
      create_job: {
        Args: {
          p_customer_id: string | null;
          p_contract_id: string | null;
          p_site_address: string | null;
          p_suburb: string | null;
          p_service_type: string | null;
          p_team_id: string | null;
          p_supervisor_id: string | null;
          p_priority: string | null;
          p_scheduled_start: string | null;
          p_scheduled_end: string | null;
        };
        Returns: Database["public"]["Tables"]["jobs"]["Row"];
      };
      update_job_status: { Args: { p_job_id: string; p_status: JobStatus }; Returns: Database["public"]["Tables"]["jobs"]["Row"] };
      record_job_event: {
        Args: {
          p_job_id: string;
          p_type: string;
          p_payload?: Json | null;
          p_gps_lat?: number | null;
          p_gps_lng?: number | null;
          p_client_generated_id?: string | null;
        };
        Returns: Database["public"]["Tables"]["job_events"]["Row"];
      };
      create_invoice: {
        Args: { p_customer_id: string | null; p_contract_id: string | null; p_issued_on: string | null; p_due_on: string | null; p_lines: Json };
        Returns: Database["public"]["Tables"]["invoices"]["Row"];
      };
      record_payment: {
        Args: { p_invoice_id: string | null; p_customer_id: string | null; p_amount_usd: number; p_method: string | null };
        Returns: Database["public"]["Tables"]["payments"]["Row"];
      };
      create_contract: {
        Args: { p_customer_id: string | null; p_service_type: string | null; p_monthly_usd: number | null; p_term_months: number | null; p_starts_on: string | null; p_auto_renew: boolean };
        Returns: Database["public"]["Tables"]["contracts"]["Row"];
      };
      adjust_stock: {
        Args: { p_item_id: string; p_location_id: string | null; p_quantity: number; p_reference: string | null };
        Returns: Database["public"]["Tables"]["stock_movements"]["Row"];
      };
      create_purchase_order: { Args: { p_supplier_id: string | null; p_amount_usd: number | null }; Returns: Database["public"]["Tables"]["purchase_orders"]["Row"] };
      decide_purchase_order: { Args: { p_po_id: string; p_approve: boolean }; Returns: Database["public"]["Tables"]["purchase_orders"]["Row"] };
      mark_po_delivered: { Args: { p_po_id: string }; Returns: Database["public"]["Tables"]["purchase_orders"]["Row"] };
    };
    Enums: {
      user_role: UserRole;
      lead_stage: LeadStage;
      lead_source: LeadSource;
      quote_status: QuoteStatus;
      job_status: JobStatus;
      invoice_status: InvoiceStatus;
      approval_status: ApprovalStatus;
      currency_code: CurrencyCode;
    };
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type InsertTables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"];
export type UpdateTables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"];
