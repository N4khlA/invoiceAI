// ─── Enums ────────────────────────────────────────────────────────────────────

export type InvoiceStatus =
  | "DRAFT"
  | "SENT"
  | "VIEWED"
  | "PAID"
  | "OVERDUE"
  | "VOID";

export type Plan = "FREE" | "PRO";

export type AiTone = "FORMAL" | "FRIENDLY" | "FIRM";

export type Currency = "USD" | "EUR" | "GBP" | "CAD" | "AUD" | "INR" | "JPY";

// ─── API Response Wrapper ─────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  businessName: string;
  businessAddress?: string;
  businessLogoUrl?: string;
  currency: Currency;
  aiTone: AiTone;
  readReceipts: boolean;
  plan: Plan;
  invoicesThisMonth: number;
  planExpiresAt?: string;
  createdAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

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
  address?: string;
  archived: boolean;
  totalInvoiced: number;
  totalPaid: number;
  outstanding: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClientRequest {
  name: string;
  email: string;
  address?: string;
}

// ─── Invoice ──────────────────────────────────────────────────────────────────

export interface LineItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxPercent: number;
  lineTotal: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  clientId: string;
  client: Client;
  issueDate: string;
  dueDate: string;
  notes?: string;
  terms?: string;
  lineItems: LineItem[];
  subtotal: number;
  taxTotal: number;
  total: number;
  snapshotData: InvoiceSnapshot;
  viewToken?: string;
  viewedAt?: string;
  paidAt?: string;
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceSnapshot {
  businessName: string;
  businessAddress?: string;
  businessLogoUrl?: string;
  clientName: string;
  clientEmail: string;
  clientAddress?: string;
}

export interface CreateInvoiceRequest {
  clientId: string;
  dueDate: string;
  notes?: string;
  terms?: string;
  lineItems: Omit<LineItem, "id" | "lineTotal">[];
}

export interface UpdateInvoiceRequest extends Partial<CreateInvoiceRequest> {}

// ─── Follow-up ────────────────────────────────────────────────────────────────

export interface FollowUp {
  id: string;
  invoiceId: string;
  subject: string;
  body: string;
  sentAt: string;
}

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
  outstandingChange: number;
}

export interface MonthlyRevenue {
  month: string; // e.g. "Jan 2024"
  revenue: number;
  paid: number;
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

export interface BillingStatus {
  plan: Plan;
  invoicesThisMonth: number;
  invoiceLimit: number;
  periodEnd?: string;
  stripeCustomerId?: string;
}

// ─── Public Invoice View (no-auth read-receipt endpoint) ─────────────────────

export interface PublicInvoiceView {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  currency: Currency;
  subtotal: number;
  taxTotal: number;
  total: number;
  notes?: string;
  terms?: string;
  viewedAt?: string;
  lineItems: LineItem[];
  snapshotData: InvoiceSnapshot;
  pdfUrl?: string;
}

