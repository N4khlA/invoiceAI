// src/services/invoice.service.ts
// Handles all business logic for Clients and Invoices.
// Every query is scoped to userId — no cross-tenant data leaks.

import crypto from "crypto";
import { Resend } from "resend";
import { InvoiceStatus, Prisma, Plan } from "@prisma/client";
import prisma from "../lib/prisma";
import { AppError } from "../lib/errors";
import { env } from "../config/env";
import { generateInvoicePdf } from "./pdf.service";

const resend = new Resend(env.RESEND_API_KEY);

const FREE_PLAN_MONTHLY_LIMIT = 5;

// ─────────────────────────────────────────────────────────────────────────────
// CLIENT METHODS
// ─────────────────────────────────────────────────────────────────────────────

export interface ListClientsParams {
  userId: string;
  page?: number;
  limit?: number;
  archived?: boolean;
}

export async function listClients({ userId, page = 1, limit = 20, archived = false }: ListClientsParams) {
  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    prisma.client.findMany({
      where: { userId, isArchived: archived },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.client.count({ where: { userId, isArchived: archived } }),
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

  // Aggregate invoice summary for this client
  const agg = await prisma.invoice.aggregate({
    where: { clientId: id, userId },
    _sum: { total: true },
  });

  const paidAgg = await prisma.invoice.aggregate({
    where: { clientId: id, userId, status: InvoiceStatus.PAID },
    _sum: { total: true },
  });

  const totalInvoiced = agg._sum.total ?? 0;
  const totalPaid = paidAgg._sum.total ?? 0;
  const outstanding = totalInvoiced - totalPaid;

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
}

export async function listInvoices({ userId, page = 1, limit = 20, status, clientId }: ListInvoicesParams) {
  const where: Prisma.InvoiceWhereInput = { userId };
  if (status) where.status = status;
  if (clientId) where.clientId = clientId;

  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
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

  // ── Auto-generate invoice number ─────────────────────────────────────────
  const invoiceCount = await prisma.invoice.count({ where: { userId } });
  const invoiceNumber = `INV-${String(invoiceCount + 1).padStart(4, "0")}`;

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
  const snapshotData = {
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
    },
  };

  // ── Create Invoice + LineItems in a transaction ───────────────────────────
  const invoice = await prisma.$transaction(async (tx) => {
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

  return invoice;
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
  const snapshotData = {
    client: {
      name: invoice.client.name,
      email: invoice.client.email,
      address: invoice.client.address,
      phone: invoice.client.phone,
      company: invoice.client.company,
    },
    business: {
      name: invoice.user.bizName,
      address: invoice.user.bizAddress,
      phone: invoice.user.bizPhone,
      website: invoice.user.bizWebsite,
      email: invoice.user.email,
      currency: invoice.user.currency,
    },
  };

  const viewUrl = `${env.FRONTEND_URL}/invoices/view/${viewToken}`;

  // Generate PDF attachment
  let pdfBuffer: Buffer | null = null;
  try {
    pdfBuffer = await generateInvoicePdf(invoice);
  } catch {
    // Non-fatal: send email without PDF if generation fails
  }

  // Build email
  const emailPayload: Parameters<typeof resend.emails.send>[0] = {
    from: env.EMAIL_FROM,
    to: invoice.client.email,
    subject: `Invoice ${invoice.number} from ${invoice.user.bizName ?? invoice.user.email}`,
    html: buildInvoiceEmailHtml({ invoice, viewUrl }),
  };

  if (pdfBuffer) {
    emailPayload.attachments = [
      {
        filename: `invoice-${invoice.number}.pdf`,
        content: pdfBuffer,
      },
    ];
  }

  await resend.emails.send(emailPayload);

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

  const allowed: InvoiceStatus[] = [InvoiceStatus.SENT, InvoiceStatus.VIEWED, InvoiceStatus.OVERDUE];
  if (!allowed.includes(invoice.status)) {
    throw AppError.validation("Invoice must be SENT, VIEWED, or OVERDUE to mark as paid.");
  }

  return prisma.invoice.update({
    where: { id },
    data: { status: InvoiceStatus.PAID, paidAt: paidAt ?? new Date() },
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
    include: { items: true },
  });
  if (!invoice) throw AppError.notFound("Invoice");

  // Mark as VIEWED on first open
  if (invoice.status === InvoiceStatus.SENT) {
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: InvoiceStatus.VIEWED, viewedAt: new Date() },
    });
    invoice.status = InvoiceStatus.VIEWED;
  }

  // Return minimal public data only (snapshotData + line items, no userId etc.)
  return {
    number: invoice.number,
    status: invoice.status,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    currency: invoice.currency,
    subtotal: invoice.subtotal,
    taxAmount: invoice.taxAmount,
    total: invoice.total,
    notes: invoice.notes,
    terms: invoice.terms,
    snapshotData: invoice.snapshotData,
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

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function buildInvoiceEmailHtml({
  invoice,
  viewUrl,
}: {
  invoice: {
    number: string;
    total: number;
    dueDate: Date;
    user: { bizName?: string | null; email: string };
    client: { name: string };
  };
  viewUrl: string;
}): string {
  const bizName = invoice.user.bizName ?? invoice.user.email;
  const dueDate = invoice.dueDate.toLocaleDateString("en-US", { dateStyle: "long" });

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Invoice ${invoice.number}</title></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px">
  <h1 style="color:#1a1a1a">Invoice ${invoice.number}</h1>
  <p>Hi ${invoice.client.name},</p>
  <p><strong>${bizName}</strong> has sent you an invoice for
    <strong>$${invoice.total.toFixed(2)}</strong> due on <strong>${dueDate}</strong>.</p>
  <a href="${viewUrl}"
     style="display:inline-block;margin:24px 0;padding:14px 28px;background:#4f46e5;
            color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
    View Invoice
  </a>
  <p style="color:#6b7280;font-size:14px">If the button above doesn't work, copy and paste this link:<br>${viewUrl}</p>
</body>
</html>`;
}
