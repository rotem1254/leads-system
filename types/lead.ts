export type LeadStatus = "new" | "in_progress" | "closed" | "irrelevant";

export interface LeadLandingPageRef {
  id: string;
  name: string;
  slug: string;
}

export interface Lead {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  message: string | null;
  page_source: string;
  status: LeadStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  landing_page_id: string | null;
  user_id: string | null;
  /** Populated in list/detail responses */
  landing_page?: LeadLandingPageRef | null;
  owner_name?: string | null;
}

export interface LeadListParams {
  page?: number;
  limit?: number;
  q?: string;
  status?: LeadStatus;
  page_source?: string;
  /** Admin-only filters */
  user_id?: string;
  landing_page_id?: string;
  /** When set, restricts rows for clients */
  scope?: { role: "admin" | "client"; userId: string };
}

export interface DashboardStats {
  total: number;
  byStatus: Record<LeadStatus, number>;
  bySource: { page_source: string; count: number }[];
  byLandingPage: { landing_page_id: string; name: string; count: number }[];
  recent: Lead[];
  totalUsers?: number;
  totalLandingPages?: number;
}
