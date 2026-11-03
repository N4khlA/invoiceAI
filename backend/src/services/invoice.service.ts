// src/services/invoice.service.ts
// Handles all business logic for Clients and Invoices.
// Every query is scoped to userId — no cross-tenant data leaks.

import crypto from "crypto";
import { InvoiceStatus, Prisma, Plan, Client, User } from "@prisma/client";
import prisma from "../lib/prisma";
import { AppError } from "../lib/errors";
import { env, features } from "../config/env";
import { sendMail, MailMessage } from "../lib/mailer";
import { getStripe } from "../lib/stripe";
import { generateInvoicePdf } from "./pdf.service";
import { invoiceEmailHtml, followUpEmailHtml, paymentReceivedEmailHtml } from "./email.service";

const FREE_PLAN_MONTHLY_LIMIT = 5;

const OPEN_STATUSES: InvoiceStatus[] = [InvoiceStatus.SENT, InvoiceStatus.VIEWED, InvoiceStatus.OVERDUE];

/** Client + business details frozen onto the invoice so later edits don't rewrite history. */
function buildSnapshot(client: Client, user: User) {
  return {
    client: {
      name: client.name,
      email: client.email,
      address: client.address,
      phone: client.phone,
      company: client.company,
    },
    business: {
      name: user.bizName,
      address: user.bizAddress,
      phone: user.bizPhone,
      website: user.bizWebsite,
      email: user.email,
      currency: user.currency,
      logoUrl: user.logoUrl,
    },
  };
}

/**
 * Next free "INV-0001"-style number. Uses the highest existing number, not a
 * count: deleting a draft would otherwise hand out a number that's still taken.
 */
async function nextInvoiceNumber(userId: string): Promise<string> {
  const rows = await prisma.invoice.findMany({ where: { userId }, select: { number: true } });
  const max = rows.reduce((m, { number }) => {
    const n = Number(/^INV-(\d+)$/.exec(number)?.[1] ?? 0);
    return n > m ? n : m;
  }, 0);
  return `INV-${String(max + 1).padStart(4, "0")}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// CLIENT METHODS
// ─────────────────────────────────────────────────────────────────────────────

export interface ListClientsParams {
  userId: string;
  page?: number;
  limit?: number;
  archived?: boolean;
  search?: string;
}

export async function listClients({ userId, page = 1, limit = 20, archived = false, search }: ListClientsParams) {
  const where: Prisma.ClientWhereInput = { userId, isArchived: archived };
  if (search) {
    where.OR = [
      { name:    { contains: search, mode: "insensitive" } },
      { email:   { contains: search, mode: "insensitive" } },
      { company: { contains: search, mode: "insensitive" } },
    ];
  }

  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    prisma.client.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.client.count({ where }),
  ]);
  return { data, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

export interface CreateClientInput {
  userId: string;
  name: string;
  email: string;
  address?: string;
  phone?: string;
  company?: string;
  notes?: string;
}

export async function createClient(input: CreateClientInput) {
  const { userId, email } = input;

  // 409 if duplicate email for this user
  const existing = await prisma.client.findFirst({ where: { userId, email } });
  if (existing) {
    throw AppError.conflict(`A client with email "${email}" already exists.`);
  }

  return prisma.client.create({ data: { ...input } });
}

export async function getClient(id: string, userId: string) {
  const client = await prisma.client.findFirst({
    where: { id, userId },
  });
  if (!client) throw AppError.notFound("Client");

  // Aggregate invoice summary for this client. Drafts were never billed and
  // voided invoices were cancelled, so neither counts as invoiced or owed.
  const [paidAgg, openAgg] = await Promise.all([
    prisma.invoice.aggregate({
      where: { clientId: id, userId, status: InvoiceStatus.PAID },
      _sum: { total: true },
    }),
    prisma.invoice.aggregate({
      where: {
        clientId: id,
        userId,
        status: { in: [InvoiceStatus.SENT, InvoiceStatus.VIEWED, InvoiceStatus.OVERDUE] },
      },
      _sum: { total: true },
    }),
  ]);

  const totalPaid = paidAgg._sum.total ?? 0;
  const outstanding = openAgg._sum.total ?? 0;
  const totalInvoiced = totalPaid + outstanding;

  return { ...client, summary: { totalInvoiced, totalPaid, outstanding } };
}

export interface UpdateClientInput {
  name?: string;
  email?: string;
  address?: string;
  phone?: string;
  company?: string;
  notes?: string;
  isArchived?: boolean;
}

export async function updateClient(id: string, userId: string, input: UpdateClientInput) {
  const client = await prisma.client.findFirst({ where: { id, userId } });
  if (!client) throw AppError.notFound("Client");

  // If email is changing, check no other client for this user has it
  if (input.email && input.email !== client.email) {
    const dup = await prisma.client.findFirst({
      where: { userId, email: input.email, NOT: { id } },
    });
    if (dup) throw AppError.conflict(`A client with email "${input.email}" already exists.`);
  }

  return prisma.client.update({ where: { id }, data: input });
}

export async function archiveClient(id: string, userId: string) {
  const client = await prisma.client.findFirst({ where: { id, userId } });
  if (!client) throw AppError.notFound("Client");
  await prisma.client.update({ where: { id }, data: { isArchived: true } });
  return { message: "Client archived" };
}

// ─────────────────────────────────────────────────────────────────────────────
// INVOICE METHODS
// ─────────────────────────────────────────────────────────────────────────────

export interface ListInvoicesParams {
  userId: string;
  page?: number;
  limit?: number;
  status?: InvoiceStatus;
  clientId?: string;
  search?: string;
}

function invoiceWhere({ userId, status, clientId, search }: Omit<ListInvoicesParams, "page" | "limit">) {
  const where: Prisma.InvoiceWhereInput = { userId };
  if (status) where.status = status;
  if (clientId) where.clientId = clientId;
  if (search) {
    where.OR = [
      { number: { contains: search, mode: "insensitive" } },
      { client: { name: { contains: search, mode: "insensitive" } } },
    ];
  }
  return where;
}

export async function listInvoices({ userId, page = 1, limit = 20, status, clientId, search }: ListInvoicesParams) {
  const where = invoiceWhere({ userId, status, clientId, search });

  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      // The snapshot can carry an inline logo (hundreds of KB); lists don't need it
      omit: { snapshotData: true },
      include: {
        items: true,
        client: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.invoice.count({ where }),
  ]);
  return { data, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

export interface LineItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
  taxPct?: number;
}

export interface CreateInvoiceInput {
  userId: string;
  clientId: string;
  dueDate: Date;
  issueDate?: Date;
  currency?: string;
  lineItems: LineItemInput[];
  notes?: string;
  terms?: string;
}

export async function createInvoice(input: CreateInvoiceInput) {
  const { userId, clientId, dueDate, issueDate, currency, lineItems, notes, terms } = input;

  // ── Plan limit enforcement ───────────────────────────────────────────────
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.plan === Plan.FREE && user.invoicesThisMonth >= FREE_PLAN_MONTHLY_LIMIT) {
    throw AppError.planLimit("Free plan allows 5 invoices per month. Upgrade to PRO to continue.");
  }

  // ── Verify clientId belongs to this user ─────────────────────────────────
  const client = await prisma.client.findFirst({ where: { id: clientId, userId } });
  if (!client) throw AppError.notFound("Client");


  // ── Calculate totals server-side ─────────────────────────────────────────
  let subtotal = 0;
  let totalTaxAmount = 0;

  const computedItems = lineItems.map((item) => {
    const taxPct = item.taxPct ?? 0;
    const lineTotal = item.quantity * item.unitPrice;
    const itemTax = lineTotal * (taxPct / 100);
    const amount = lineTotal + itemTax;
    subtotal += lineTotal;
    totalTaxAmount += itemTax;
    return {
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      taxPct,
      lineTotal,
      taxAmount: itemTax,
      amount,
    };
  });

  const total = subtotal + totalTaxAmount;

  // ── Build snapshot of client + user business info ────────────────────────
  const snapshotData = buildSnapshot(client, user);

  // ── Create Invoice + LineItems in a transaction ───────────────────────────
  // Two creates at once (double-clicked Duplicate) can pick the same number:
  // the unique index rejects one, which then retries with the next number.
  for (let attempt = 1; ; attempt++) {
    const invoiceNumber = await nextInvoiceNumber(userId);
    try {
      return await insertInvoice(invoiceNumber);
    } catch (err) {
      const taken = err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
      if (!taken || attempt >= 3) throw err;
    }
  }

  async function insertInvoice(invoiceNumber: string) {
    return prisma.$transaction(async (tx) => {
      const created = await tx.invoice.create({
        data: {
          userId,
          clientId,
          number: invoiceNumber,
          issueDate, // undefined → Prisma default (now())
          currency: currency ?? user.currency, // default to the user's business currency
          dueDate,
          subtotal,
          taxAmount: totalTaxAmount,
          total,
          notes,
          terms,
          snapshotData,
          items: {
            create: computedItems,
          },
        },
        include: { items: true },
      });

      await tx.user.update({
        where: { id: userId },
        data: { invoicesThisMonth: { increment: 1 } },
      });

      return created;
    });
  }
}

export async function getInvoice(id: string, userId: string) {
  const invoice = await prisma.invoice.findFirst({
    where: { id, userId },
    include: {
      items: true,
      followUps: true,
      client: { select: { id: true, name: true, email: true, address: true, phone: true, company: true } },
    },
  });
  if (!invoice) throw AppError.notFound("Invoice");
  return invoice;
}

export interface UpdateInvoiceInput {
  dueDate?: Date;
  notes?: string;
  terms?: string;
  lineItems?: LineItemInput[];
}

export async function updateInvoice(id: string, userId: string, input: UpdateInvoiceInput) {
  const invoice = await prisma.invoice.findFirst({ where: { id, userId } });
  if (!invoice) throw AppError.notFound("Invoice");
  if (invoice.status !== InvoiceStatus.DRAFT) {
    throw AppError.validation("Only DRAFT invoices can be edited.");
  }

  const updateData: Prisma.InvoiceUpdateInput = {
    dueDate: input.dueDate,
    notes: input.notes,
    terms: input.terms,
  };

  // If lineItems provided, recalculate totals and replace items
  if (input.lineItems) {
    let subtotal = 0;
    let totalTaxAmount = 0;

    const computedItems = input.lineItems.map((item) => {
      const taxPct = item.taxPct ?? 0;
      const lineTotal = item.quantity * item.unitPrice;
      const itemTax = lineTotal * (taxPct / 100);
      const amount = lineTotal + itemTax;
      subtotal += lineTotal;
      totalTaxAmount += itemTax;
      return { description: item.description, quantity: item.quantity, unitPrice: item.unitPrice, taxPct, lineTotal, taxAmount: itemTax, amount };
    });

    updateData.subtotal = subtotal;
    updateData.taxAmount = totalTaxAmount;
    updateData.total = subtotal + totalTaxAmount;
    updateData.items = {
      deleteMany: {},
      create: computedItems,
    };
  }

  return prisma.invoice.update({
    where: { id },
    data: updateData,
    include: { items: true },
  });
}

export async function deleteInvoice(id: string, userId: string) {
  const invoice = await prisma.invoice.findFirst({ where: { id, userId } });
  if (!invoice) throw AppError.notFound("Invoice");
  if (invoice.status !== InvoiceStatus.DRAFT) {
    throw AppError.validation("Only DRAFT invoices can be deleted.");
  }
  await prisma.invoice.delete({ where: { id } });
}

export async function sendInvoice(id: string, userId: string) {
  const invoice = await prisma.invoice.findFirst({
    where: { id, userId },
    include: { items: true, client: true, user: true },
  });
  if (!invoice) throw AppError.notFound("Invoice");
  if (invoice.status !== InvoiceStatus.DRAFT) {
    throw AppError.validation("Only DRAFT invoices can be sent.");
  }

  // Generate a fresh view token
  const viewToken = crypto.randomUUID();

  // Take snapshot
  const snapshotData = buildSnapshot(invoice.client, invoice.user);

  const viewUrl = `${env.FRONTEND_URL}/invoices/view/${viewToken}`;

  // Generate PDF attachment
  let pdfBuffer: Buffer | null = null;
  try {
    pdfBuffer = await generateInvoicePdf(invoice);
  } catch {
    // Non-fatal: send email without PDF if generation fails
  }

  const email: MailMessage = {
    to: invoice.client.email,
    subject: `Invoice ${invoice.number} from ${invoice.user.bizName ?? invoice.user.email}`,
    html: invoiceEmailHtml({
      number: invoice.number,
      bizName: invoice.user.bizName ?? invoice.user.email,
      clientName: invoice.client.name,
      total: invoice.total,
      currency: invoice.currency,
      dueDate: invoice.dueDate,
      viewUrl,
    }),
  };

  if (pdfBuffer) {
    email.attachments = [{ filename: `invoice-${invoice.number}.pdf`, content: pdfBuffer }];
  }

  await sendMail(email);

  const updated = await prisma.invoice.update({
    where: { id },
    data: {
      status: InvoiceStatus.SENT,
      sentAt: new Date(),
      viewToken,
      snapshotData,
    },
    include: { items: true },
  });

  return updated;
}

export async function markInvoicePaid(id: string, userId: string, paidAt?: Date) {
  const invoice = await prisma.invoice.findFirst({ where: { id, userId } });
  if (!invoice) throw AppError.notFound("Invoice");

  if (!OPEN_STATUSES.includes(invoice.status)) {
    throw AppError.validation("Invoice must be SENT, VIEWED, or OVERDUE to mark as paid.");
  }

  return prisma.invoice.update({
    where: { id },
    data: { status: InvoiceStatus.PAID, paidAt: paidAt ?? new Date(), paidVia: "MANUAL" },
    include: { items: true },
  });
}

export async function voidInvoice(id: string, userId: string) {
  const invoice = await prisma.invoice.findFirst({ where: { id, userId } });
  if (!invoice) throw AppError.notFound("Invoice");

  if (invoice.status === InvoiceStatus.PAID || invoice.status === InvoiceStatus.VOID) {
    throw AppError.validation("Cannot void a PAID or already VOID invoice.");
  }

  return prisma.invoice.update({
    where: { id },
    data: { status: InvoiceStatus.VOID, voidedAt: new Date() },
    include: { items: true },
  });
}

export async function getInvoicePdf(id: string, userId: string): Promise<{ pdf: Buffer; number: string }> {
  const invoice = await prisma.invoice.findFirst({
    where: { id, userId },
    include: { items: true, client: true, user: true },
  });
  if (!invoice) throw AppError.notFound("Invoice");

  const pdf = await generateInvoicePdf(invoice);
  return { pdf, number: invoice.number };
}

export async function getPublicInvoice(viewToken: string) {
  const invoice = await prisma.invoice.findFirst({
    where: { viewToken },
    include: { items: true, user: { select: { readReceipts: true, logoUrl: true } } },
  });
  if (!invoice) throw AppError.notFound("Invoice");

  // Mark as VIEWED on first open (unless the sender turned read receipts off)
  if (invoice.status === InvoiceStatus.SENT && invoice.user?.readReceipts !== false) {
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: InvoiceStatus.VIEWED, viewedAt: new Date() },
    });
    invoice.status = InvoiceStatus.VIEWED;
  }

  // Invoices sent before logos were snapshotted fall back to the live logo
  const snapshot = (invoice.snapshotData ?? {}) as { business?: Record<string, unknown> };
  if (snapshot.business && !("logoUrl" in snapshot.business)) {
    snapshot.business.logoUrl = invoice.user?.logoUrl ?? null;
  }

  // Return minimal public data only (snapshotData + line items, no userId etc.)
  return {
    number: invoice.number,
    status: invoice.status,
    paidAt: invoice.paidAt,
    payable: OPEN_STATUSES.includes(invoice.status) && invoice.total > 0 && (features.payments || features.demoPayments),
    // false → "Pay now" opens the simulated checkout instead of Stripe
    paymentsLive: features.payments,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    currency: invoice.currency,
    subtotal: invoice.subtotal,
    taxAmount: invoice.taxAmount,
    total: invoice.total,
    notes: invoice.notes,
    terms: invoice.terms,
    snapshotData: snapshot,
    items: invoice.items,
  };
}

export async function getFollowUps(invoiceId: string, userId: string) {
  // Verify invoice belongs to user first
  const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, userId } });
  if (!invoice) throw AppError.notFound("Invoice");

  return prisma.followUp.findMany({
    where: { invoiceId },
    orderBy: { sentAt: "desc" },
  });
}

export interface SendFollowUpInput {
  subject: string;
  body: string;
}

/** Email a payment reminder to the client and record it on the invoice. */
export async function sendFollowUp(invoiceId: string, userId: string, input: SendFollowUpInput) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, userId },
    include: { client: true },
  });
  if (!invoice) throw AppError.notFound("Invoice");

  if (!OPEN_STATUSES.includes(invoice.status)) {
    throw AppError.validation("Follow-ups can only be sent for SENT, VIEWED or OVERDUE invoices.");
  }

  await sendMail({
    to: invoice.client.email,
    subject: input.subject,
    html: followUpEmailHtml({
      body: input.body,
      viewUrl: `${env.FRONTEND_URL}/invoices/view/${invoice.viewToken}`,
    }),
  });

  return prisma.followUp.create({
    data: { invoiceId, method: "EMAIL", notes: input.subject },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// DUPLICATE / EXPORT
// ─────────────────────────────────────────────────────────────────────────────

/** Copy an invoice into a fresh DRAFT dated today, keeping its payment window. */
export async function duplicateInvoice(id: string, userId: string) {
  const source = await prisma.invoice.findFirst({
    where: { id, userId },
    include: { items: { orderBy: { createdAt: "asc" } } },
  });
  if (!source) throw AppError.notFound("Invoice");

  const termDays = Math.round((source.dueDate.getTime() - source.issueDate.getTime()) / 86_400_000);
  const dueDate = new Date(Date.now() + (termDays > 0 ? termDays : 14) * 86_400_000);

  return createInvoice({
    userId,
    clientId: source.clientId,
    dueDate,
    currency: source.currency,
    lineItems: source.items.map(({ description, quantity, unitPrice, taxPct }) => ({
      description,
      quantity,
      unitPrice,
      taxPct,
    })),
    notes: source.notes ?? undefined,
    terms: source.terms ?? undefined,
  });
}

const CSV_EXPORT_LIMIT = 5000;

/** Quote a CSV cell; a leading = + - @ is neutralised so spreadsheets don't run it as a formula. */
function csvCell(value: string | number | null | undefined): string {
  let s = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) || s.startsWith("'") ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function exportInvoicesCsv(params: Omit<ListInvoicesParams, "page" | "limit">): Promise<string> {
  const invoices = await prisma.invoice.findMany({
    where: invoiceWhere(params),
    orderBy: { issueDate: "desc" },
    take: CSV_EXPORT_LIMIT,
    include: { client: { select: { name: true, email: true } } },
  });

  const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");
  const header = [
    "Number", "Client", "Client email", "Status", "Issue date", "Due date",
    "Currency", "Subtotal", "Tax", "Total", "Sent", "Paid", "Paid via",
  ];
  const rows = invoices.map((inv) => [
    inv.number, inv.client.name, inv.client.email, inv.status, day(inv.issueDate), day(inv.dueDate),
    inv.currency, inv.subtotal.toFixed(2), inv.taxAmount.toFixed(2), inv.total.toFixed(2),
    day(inv.sentAt), day(inv.paidAt), inv.paidVia,
  ]);

  return [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

// ─────────────────────────────────────────────────────────────────────────────
// CLIENT PAYMENTS ("Pay now" on the public invoice page)
// ─────────────────────────────────────────────────────────────────────────────

// Stripe amounts are in the currency's minor unit; these have none
const ZERO_DECIMAL = new Set([
  "BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "MGA", "PYG", "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF",
]);

function toMinorUnits(amount: number, currency: string): number {
  return Math.round(ZERO_DECIMAL.has(currency.toUpperCase()) ? amount : amount * 100);
}

async function findPayableInvoice(viewToken: string) {
  const invoice = await prisma.invoice.findFirst({
    where: { viewToken },
    include: { client: true, user: { select: { bizName: true, email: true } } },
  });
  if (!invoice) throw AppError.notFound("Invoice");
  if (invoice.status === InvoiceStatus.PAID) throw AppError.conflict("This invoice has already been paid.");
  if (!OPEN_STATUSES.includes(invoice.status) || invoice.total <= 0) {
    throw AppError.validation("This invoice can't be paid online.");
  }
  return invoice;
}

/**
 * Start a client payment. Returns the URL to send the browser to: a Stripe
 * Checkout page, or the simulated checkout when Stripe isn't configured.
 */
export async function createInvoicePayment(viewToken: string): Promise<string> {
  const invoice = await findPayableInvoice(viewToken);
  const backTo = `${env.FRONTEND_URL}/invoices/view/${viewToken}`;

  if (!features.payments) {
    if (!features.demoPayments) throw AppError.serviceUnavailable("Online payments are not enabled.");
    return `${backTo}/checkout`;
  }

  const stripe = getStripe();

  // Reuse the session from an earlier click: two open sessions would let the
  // client pay twice (sent invoices can't change, so the amount still holds)
  if (invoice.stripeCheckoutSessionId) {
    const previous = await stripe.checkout.sessions.retrieve(invoice.stripeCheckoutSessionId);
    if (previous.status === "open" && previous.url) return previous.url;
    if (previous.status === "complete") {
      throw AppError.conflict("A payment for this invoice is already being processed.");
    }
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: invoice.client.email,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: invoice.currency.toLowerCase(),
        unit_amount: toMinorUnits(invoice.total, invoice.currency),
        product_data: {
          name: `Invoice ${invoice.number}`,
          description: `From ${invoice.user.bizName ?? invoice.user.email}`,
        },
      },
    }],
    // Fulfilment happens in the webhook — these pages only show the outcome
    success_url: `${backTo}?payment=success`,
    cancel_url:  `${backTo}?payment=cancel`,
    metadata: { kind: "invoice_payment", invoiceId: invoice.id },
    payment_intent_data: { metadata: { invoiceId: invoice.id } },
  });
  if (!session.url) throw AppError.internal("Stripe did not return a checkout URL.");

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: { stripeCheckoutSessionId: session.id },
  });
  return session.url;
}

/** Simulated checkout (no Stripe key): settles the invoice as paid via DEMO. */
export async function completeDemoPayment(viewToken: string) {
  if (features.payments || !features.demoPayments) {
    throw AppError.notFound("Route");
  }
  const invoice = await findPayableInvoice(viewToken);
  await settleInvoicePayment(invoice.id, "DEMO");
  return { status: InvoiceStatus.PAID };
}

/**
 * Mark an invoice PAID after a successful online payment and tell its owner.
 * Idempotent: Stripe retries webhooks, and only the first call changes anything.
 */
export async function settleInvoicePayment(invoiceId: string, via: "STRIPE" | "DEMO", sessionId?: string) {
  const { count } = await prisma.invoice.updateMany({
    where: { id: invoiceId, status: { in: OPEN_STATUSES } },
    data: {
      status: InvoiceStatus.PAID,
      paidAt: new Date(),
      paidVia: via,
      ...(sessionId ? { stripeCheckoutSessionId: sessionId } : {}),
    },
  });
  if (count === 0) {
    if (via === "STRIPE") await flagPaymentOnClosedInvoice(invoiceId);
    return;
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { client: { select: { name: true } }, user: { select: { email: true } } },
  });
  if (!invoice) return;

  try {
    await sendMail({
      to: invoice.user.email,
      subject: `Payment received: ${invoice.client.name} paid invoice ${invoice.number}`,
      html: paymentReceivedEmailHtml({
        number: invoice.number,
        clientName: invoice.client.name,
        total: invoice.total,
        currency: invoice.currency,
        invoiceUrl: `${env.FRONTEND_URL}/invoices/${invoice.id}`,
      }),
    });
  } catch (err) {
    // The payment is recorded either way; a missed notification isn't worth a retry storm
    console.error("[invoice.service] Payment notification failed:", err);
  }
}

/**
 * Stripe took money for an invoice that was voided while the client was on
 * the checkout page. Nothing to mark paid — but the owner must refund or
 * reopen, so make sure they hear about it. (Retried events of an already
 * PAID invoice land here too and are ignored.)
 */
async function flagPaymentOnClosedInvoice(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { client: { select: { name: true } }, user: { select: { email: true } } },
  });
  if (!invoice || invoice.status === InvoiceStatus.PAID) return;

  console.error(`[invoice.service] Stripe payment received for ${invoice.status} invoice ${invoice.number} (${invoice.id})`);
  try {
    await sendMail({
      to: invoice.user.email,
      subject: `Action needed: payment received for ${invoice.status.toLowerCase()} invoice ${invoice.number}`,
      html: followUpEmailHtml({
        body:
          `${invoice.client.name} paid invoice ${invoice.number} online, but the invoice was ${invoice.status.toLowerCase()} ` +
          `by then, so it wasn't marked paid.\n\nRefund the payment from your Stripe dashboard, or contact the client.`,
        viewUrl: `${env.FRONTEND_URL}/invoices/${invoice.id}`,
      }),
    });
  } catch (err) {
    console.error("[invoice.service] Closed-invoice payment alert failed:", err);
  }
}
