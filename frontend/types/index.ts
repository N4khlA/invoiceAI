// Types mirror the backend API contract exactly (backend = source of truth).
// Field names follow the Prisma schema: `number`, `items`, `taxAmount`,
// `taxPct`, `isArchived`, `bizName`, …

// ─── Enums ────────────────────────────────────────────────────────────────────

export type InvoiceStatus =
  | "DRAFT"
  | "SENT"
  | "VIEWED"
  | "PAID"
  | "OVERDUE"
  | "VOID";

export type Plan = "FREE" | "PRO";

export type AiTone = "PROFESSIONAL" | "FRIENDLY" | "FORMAL";

export type Currency = "USD" | "EUR" | "GBP" | "BRL" | "CAD" | "AUD" | "INR" | "JPY";

// ─── Pagination envelope (GET list endpoints) ─────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

/**
 * Shape returned by /auth/register, /auth/login, /auth/refresh and /account.
 * InvoicesThisMonth/subscription fields are only present on /account reads.
 */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  bizName: string;
  bizAddress?: string;
  bizPhone?: string;
  bizWebsite?: string;
  logoUrl?: string;
  currency: Currency;
  aiTone: AiTone;
  readReceipts: boolean;
  plan: Plan;
  subscriptionStatus?: string | null;
  invoicesThisMonth?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

/** Backend register schema accepts `businessName` (mapped to bizName). */
export interface RegisterRequest {
  email: string;
  password: string;
  businessName: string;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

// ─── Client ───────────────────────────────────────────────────────────────────

export interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  company?: string | null;
  notes?: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  /** Only present on GET /clients/:id */
  summary?: {
    totalInvoiced: number;
    totalPaid: number;
    outstanding: number;
  };
}

export interface CreateClientRequest {
  name: string;
  email: string;
  address?: string;
  phone?: string;
  company?: string;
  notes?: string;
}

// ─── Invoice ──────────────────────────────────────────────────────────────────

export interface LineItem {
  id?: string;
  invoiceId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  /** Tax percentage for this line, e.g. 20 = 20% */
  taxPct: number;
  /** quantity * unitPrice */
  lineTotal: number;
  /** lineTotal * taxPct / 100 */
  taxAmount: number;
  /** lineTotal + taxAmount */
  amount: number;
}

/** Client fields embedded on invoice reads */
export interface InvoiceClient {
  id: string;
  name: string;
  email: string;
  address?: string | null;
  phone?: string | null;
  company?: string | null;
}

export interface Invoice {
  id: string;
  number: string;
  status: InvoiceStatus;
  clientId: string;
  client?: InvoiceClient;
  issueDate: string;
  dueDate: string;
  currency: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  notes?: string | null;
  terms?: string | null;
  snapshotData?: InvoiceSnapshot | null;
  viewToken?: string;
  readAt?: string | null;
  sentAt?: string | null;
  viewedAt?: string | null;
  paidAt?: string | null;
  voidedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  items: LineItem[];
  followUps?: FollowUp[];
}

/** Snapshot of client + business info captured at creation time */
export interface InvoiceSnapshot {
  client: {
    name: string;
    email: string;
    address?: string | null;
    phone?: string | null;
    company?: string | null;
  };
  business: {
    name: string;
    address?: string | null;
    phone?: string | null;
    website?: string | null;
    email: string;
    currency: string;
  };
}

export interface CreateInvoiceRequest {
  clientId: string;
  dueDate: string;
  issueDate?: string;
  currency?: string;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    taxPct?: number;
  }>;
  notes?: string;
  terms?: string;
}

export interface UpdateInvoiceRequest extends Partial<CreateInvoiceRequest> {}

// ─── Follow-up ────────────────────────────────────────────────────────────────

/** Mirrors the FollowUp Prisma model (notes + method, no subject/body). */
export interface FollowUp {
  id: string;
  invoiceId: string;
  sentAt: string;
  /** "EMAIL" | "MANUAL" */
  method: string;
  notes?: string | null;
}

/** Response of POST /ai/follow-up */
export interface AiFollowUpSuggestion {
  subject: string;
  body: string;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardStats {
  revenueYtd: number;
  outstandingAmount: number;
  overdueCount: number;
  paidThisMonth: number;
  revenueYtdChange: number;
}

export interface MonthlyRevenue {
  month: string; // e.g. "2026-01"
  amount: number;
}

export interface OverdueInvoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  amount: number;
  daysOverdue: number;
  dueDate: string;
}

export interface DashboardData {
  stats: DashboardStats;
  revenueChart: MonthlyRevenue[];
  recentInvoices: Invoice[];
  overdueInvoices: OverdueInvoice[];
}

// ─── Billing ─────────────────────────────────────────────────────────────────

/** GET /v1/billing/status */
export interface BillingStatus {
  plan: Plan;
  subscriptionStatus?: string | null;
  stripeSubscriptionId?: string | null;
  stripePriceId?: string | null;
  invoicesThisMonth: number;
}

// ─── Public Invoice View (no-auth read-receipt endpoint) ─────────────────────

/** Response of GET /v1/invoices/view/:token — whitelist only, no ids. */
export interface PublicInvoiceView {
  number: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  currency: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  notes?: string | null;
  terms?: string | null;
  snapshotData: InvoiceSnapshot;
  items: LineItem[];
}
