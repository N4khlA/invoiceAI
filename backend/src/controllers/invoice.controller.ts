// src/controllers/invoice.controller.ts
// HTTP layer for Invoice CRUD + send / PDF / mark-paid / public-view.
// The public endpoint (getPublicInvoice) requires no auth token.

import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { InvoiceStatus } from "@prisma/client";
import {
  listInvoices as svcListInvoices,
  createInvoice as svcCreateInvoice,
  getInvoice as svcGetInvoice,
  updateInvoice as svcUpdateInvoice,
  deleteInvoice as svcDeleteInvoice,
  sendInvoice as svcSendInvoice,
  getInvoicePdf as svcGetInvoicePdf,
  markInvoicePaid as svcMarkInvoicePaid,
  getPublicInvoice as svcGetPublicInvoice,
} from "../services/invoice.service";
import { AppError } from "../lib/errors";

// ── Schemas ──────────────────────────────────────────────────────────────────

const lineItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.number().positive("Quantity must be positive"),
  unitPrice: z.number().nonnegative("Unit price must be ≥ 0"),
  taxPct: z.number().min(0).max(100).default(0),
});

const createSchema = z.object({
  clientId: z.string().cuid("Invalid clientId"),
  dueDate: z.coerce.date(),
  issueDate: z.coerce.date().optional(),
  currency: z.string().length(3, "Currency must be a 3-letter ISO code").optional(),
  lineItems: z.array(lineItemSchema).min(1, "At least one line item is required"),
  notes: z.string().optional(),
  terms: z.string().optional(),
});

const updateSchema = z.object({
  dueDate: z.coerce.date().optional(),
  notes: z.string().optional(),
  terms: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1).optional(),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.nativeEnum(InvoiceStatus).optional(),
  clientId: z.string().optional(),
});

const markPaidSchema = z.object({
  paidAt: z.coerce.date().optional(),
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function getUserId(req: Request): string {
  const id = req.user?.sub;
  if (!id) throw AppError.unauthorized("Not authenticated");
  return id;
}

/** Express route params may be string|string[] depending on TS version — cast safely. */
function getParam(req: Request, key: string): string {
  return String(req.params[key]);
}

// ── Handlers ─────────────────────────────────────────────────────────────────

export async function listInvoices(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    const query = listQuerySchema.safeParse(req.query);
    if (!query.success) {
      return next(AppError.validation("Invalid query", query.error.flatten()));
    }
    const result = await svcListInvoices({ userId, ...query.data });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function createInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    const body = createSchema.safeParse(req.body);
    if (!body.success) {
      return next(AppError.validation("Validation failed", body.error.flatten()));
    }
    const invoice = await svcCreateInvoice({ userId, ...body.data });
    res.status(201).json(invoice);
  } catch (err) {
    next(err);
  }
}

export async function getInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    const invoice = await svcGetInvoice(getParam(req, "id"), userId);
    res.json(invoice);
  } catch (err) {
    next(err);
  }
}

export async function updateInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    const body = updateSchema.safeParse(req.body);
    if (!body.success) {
      return next(AppError.validation("Validation failed", body.error.flatten()));
    }
    if (Object.keys(body.data).length === 0) {
      return next(AppError.validation("No fields provided for update."));
    }
    const invoice = await svcUpdateInvoice(getParam(req, "id"), userId, body.data);
    res.json(invoice);
  } catch (err) {
    next(err);
  }
}

export async function deleteInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    await svcDeleteInvoice(getParam(req, "id"), userId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function sendInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    const invoice = await svcSendInvoice(getParam(req, "id"), userId);
    res.json(invoice);
  } catch (err) {
    next(err);
  }
}

export async function downloadPdf(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    const { pdf, number } = await svcGetInvoicePdf(getParam(req, "id"), userId);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="invoice-${number}.pdf"`);
    res.send(pdf);
  } catch (err) {
    next(err);
  }
}

export async function markPaid(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    const body = markPaidSchema.safeParse(req.body ?? {});
    if (!body.success) {
      return next(AppError.validation("Validation failed", body.error.flatten()));
    }
    const invoice = await svcMarkInvoicePaid(getParam(req, "id"), userId, body.data.paidAt);
    res.json(invoice);
  } catch (err) {
    next(err);
  }
}

/** Public — no auth. Used by clients to view invoice link. */
export async function getPublicInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Express route params are always strings; cast to ensure type compatibility
    const token = String(req.params.token);
    const data = await svcGetPublicInvoice(token);
    res.json(data);
  } catch (err) {
    next(err);
  }
}
