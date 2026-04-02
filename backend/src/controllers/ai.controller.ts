// src/controllers/ai.controller.ts

import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { AiTone } from "@prisma/client";
import { AppError } from "../lib/errors";
import { generateFollowUp } from "../services/ai.service";

function getUserId(req: Request): string {
  const id = req.user?.sub;
  if (!id) throw AppError.unauthorized("Not authenticated");
  return id;
}

const followUpSchema = z.object({
  invoiceId: z.string().min(1, "invoiceId is required"),
  tone:      z.nativeEnum(AiTone).optional(),
}).strict();

/** POST /v1/ai/follow-up — generate AI email draft */
export async function followUp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);

    const body = followUpSchema.safeParse(req.body);
    if (!body.success) {
      return next(AppError.validation("Validation failed", body.error.flatten()));
    }

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
