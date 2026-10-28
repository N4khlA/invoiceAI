// src/controllers/client.controller.ts
// HTTP layer: validates input, calls service, returns responses.
// All handlers are userId-scoped via req.user.sub (set by authenticate middleware).

import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import {
  listClients as svcListClients,
  createClient as svcCreateClient,
  getClient as svcGetClient,
  updateClient as svcUpdateClient,
  archiveClient as svcArchiveClient,
} from "../services/invoice.service";
import { AppError } from "../lib/errors";

// ── Schemas ──────────────────────────────────────────────────────────────────

const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  address: z.string().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  notes: z.string().optional(),
});

const updateSchema = createSchema.partial().extend({
  // Archive/unarchive is a PATCH { isArchived } — no dedicated route
  isArchived: z.boolean().optional(),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  // Boolean coercion from query string — .default(false) not "false"
  archived: z.enum(["true", "false"]).transform((v) => v === "true").default(false),
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

export async function listClients(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    const query = listQuerySchema.safeParse(req.query);
    if (!query.success) {
      return next(AppError.validation("Invalid query", query.error.flatten()));
    }
    const result = await svcListClients({ userId, ...query.data });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function createClient(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    const body = createSchema.safeParse(req.body);
    if (!body.success) {
      return next(AppError.validation("Validation failed", body.error.flatten()));
    }
    const client = await svcCreateClient({ userId, ...body.data });
    res.status(201).json(client);
  } catch (err) {
    next(err);
  }
}

export async function getClient(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    const client = await svcGetClient(getParam(req, "id"), userId);
    res.json(client);
  } catch (err) {
    next(err);
  }
}

export async function updateClient(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    const body = updateSchema.safeParse(req.body);
    if (!body.success) {
      return next(AppError.validation("Validation failed", body.error.flatten()));
    }
    if (Object.keys(body.data).length === 0) {
      return next(AppError.validation("No fields provided for update."));
    }
    const client = await svcUpdateClient(getParam(req, "id"), userId, body.data);
    res.json(client);
  } catch (err) {
    next(err);
  }
}

export async function deleteClient(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    const result = await svcArchiveClient(getParam(req, "id"), userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
