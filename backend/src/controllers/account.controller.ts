// src/controllers/account.controller.ts

import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { AiTone } from "@prisma/client";
import prisma from "../lib/prisma";
import { AppError } from "../lib/errors";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getUserId(req: Request): string {
  const id = req.user?.sub;
  if (!id) throw AppError.unauthorized("Not authenticated");
  return id;
}

/** Fields to exclude from every user response */
const SAFE_USER_SELECT = {
  id: true,
  email: true,
  name: true,
  plan: true,
  logoUrl: true,
  bizName: true,
  bizAddress: true,
  bizPhone: true,
  bizWebsite: true,
  currency: true,
  aiTone: true,
  readReceipts: true,
  autoReminders: true,
  stripeCustomerId: true,
  stripeSubscriptionId: true,
  stripePriceId: true,
  subscriptionStatus: true,
  invoicesThisMonth: true,
  createdAt: true,
  updatedAt: true,
} as const;

// ── Validation schemas ────────────────────────────────────────────────────────

const updateAccountSchema = z.object({
  name:               z.string().max(120).optional(),
  bizName:            z.string().min(1).max(120).optional(),
  // "" clears the logo. Uploaded files go through PUT /account/logo instead.
  logoUrl:            z.union([
                        z.string().url("Invalid logo URL").regex(/^https?:\/\//i, "Logo URL must start with http(s)://"),
                        z.literal(""),
                      ]).optional()
                        .transform((v) => (v === "" ? null : v)),
  bizAddress:         z.string().max(300).optional(),
  bizPhone:           z.string().max(40).optional(),
  bizWebsite:         z.union([z.string().url("Invalid website URL"), z.literal("")]).optional(),
  currency:           z.string().length(3, "Currency must be a 3-letter ISO code").optional(),
  aiTone:             z.nativeEnum(AiTone).optional(),
  readReceipts:       z.boolean().optional(),
  autoReminders:      z.boolean().optional(),
}).strict();

// Logos are stored inline as data URLs (no file storage to configure).
// SVG is refused: it can carry scripts. The magic bytes must match the type.
const LOGO_MAX_BYTES = 512 * 1024;
const LOGO_SIGNATURES: Record<string, (b: Buffer) => boolean> = {
  "image/png":  (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  "image/jpeg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/webp": (b) => b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP",
};

const uploadLogoSchema = z.object({
  dataUrl: z.string().max(Math.ceil(LOGO_MAX_BYTES * 1.4) + 64, "Logo must be 512 KB or smaller"),
}).strict();

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
}).strict();

// ── Handlers ──────────────────────────────────────────────────────────────────

/** GET /v1/account — return current user (no password hash) */
export async function getAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: SAFE_USER_SELECT,
    });
    if (!user) throw AppError.notFound("User");
    res.json(user);
  } catch (err) {
    next(err);
  }
}

/** PATCH /v1/account — update account details */
export async function updateAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);

    const body = updateAccountSchema.safeParse(req.body);
    if (!body.success) {
      return next(AppError.validation("Validation failed", body.error.flatten()));
    }

    if (Object.keys(body.data).length === 0) {
      return next(AppError.validation("No fields provided for update."));
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: body.data,
      select: SAFE_USER_SELECT,
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

/** PATCH /v1/account/password — change password + revoke all refresh tokens */
export async function changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);

    const body = changePasswordSchema.safeParse(req.body);
    if (!body.success) {
      return next(AppError.validation("Validation failed", body.error.flatten()));
    }

    const { currentPassword, newPassword } = body.data;

    // Verify current password
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { password: true } });
    if (!user) throw AppError.notFound("User");

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
      return next(AppError.unauthorized("Current password is incorrect"));
    }

    const hashed = await bcrypt.hash(newPassword, 12);

    // Update password and revoke all refresh tokens in a transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { password: hashed },
      }),
      prisma.refreshToken.deleteMany({
        where: { userId },
      }),
    ]);

    res.json({ message: "Password updated" });
  } catch (err) {
    next(err);
  }
}

/** PUT /v1/account/logo — { dataUrl: "data:image/png;base64,…" } */
export async function uploadLogo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);

    const body = uploadLogoSchema.safeParse(req.body);
    if (!body.success) {
      return next(AppError.validation("Validation failed", body.error.flatten()));
    }

    const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(body.data.dataUrl);
    if (!match) {
      return next(AppError.validation("Logo must be a PNG, JPEG or WebP image."));
    }
    const [, mime, base64] = match;
    const bytes = Buffer.from(base64, "base64");
    if (bytes.length === 0 || bytes.length > LOGO_MAX_BYTES) {
      return next(AppError.validation("Logo must be 512 KB or smaller."));
    }
    if (!LOGO_SIGNATURES[mime](bytes)) {
      return next(AppError.validation("That file isn't a valid PNG, JPEG or WebP image."));
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { logoUrl: `data:${mime};base64,${bytes.toString("base64")}` },
      select: SAFE_USER_SELECT,
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

/** DELETE /v1/account/logo */
export async function deleteLogo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { logoUrl: null },
      select: SAFE_USER_SELECT,
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}
