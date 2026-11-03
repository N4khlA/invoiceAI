// src/controllers/ai.controller.ts

import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { AiTone } from "@prisma/client";
import { AppError } from "../lib/errors";
import { assertPro } from "../lib/plan";
import { generateFollowUp, generateInvoiceText } from "../services/ai.service";

function getUserId(req: Request): string {
  const id = req.user?.sub;
  if (!id) throw AppError.unauthorized("Not authenticated");
  return id;
}

const followUpSchema = z.object({
  invoiceId: z.string().min(1, "invoiceId is required"),
  tone:      z.nativeEnum(AiTone).optional(),
}).strict();

const invoiceTextSchema = z.object({
  kind:     z.enum(["notes", "terms"]),
  clientId: z.string().min(1).optional(),
  items:    z.array(z.string().max(200)).max(50).optional(),
  dueDate:  z.coerce.date().optional(),
  tone:     z.nativeEnum(AiTone).optional(),
}).strict();

/** POST /v1/ai/follow-up — generate AI email draft (PRO) */
export async function followUp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);

    const body = followUpSchema.safeParse(req.body);
    if (!body.success) {
      return next(AppError.validation("Validation failed", body.error.flatten()));
    }

    await assertPro(userId, "AI follow-ups");

    const result = await generateFollowUp({
      userId,
      invoiceId: body.data.invoiceId,
      tone:      body.data.tone,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}

/** POST /v1/ai/invoice-text — draft invoice notes or payment terms (PRO) */
export async function invoiceText(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);

    const body = invoiceTextSchema.safeParse(req.body);
    if (!body.success) {
      return next(AppError.validation("Validation failed", body.error.flatten()));
    }

    await assertPro(userId, "AI writing");

    res.json(await generateInvoiceText({ userId, ...body.data }));
  } catch (err) {
    next(err);
  }
}
