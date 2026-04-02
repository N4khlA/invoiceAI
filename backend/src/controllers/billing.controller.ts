// src/controllers/billing.controller.ts

import { Request, Response, NextFunction } from "express";
import { AppError } from "../lib/errors";
import {
  createCheckoutSession,
  createPortalSession,
  handleWebhook,
  getBillingStatus,
} from "../services/billing.service";

function getUserId(req: Request): string {
  const id = req.user?.sub;
  if (!id) throw AppError.unauthorized("Not authenticated");
  return id;
}

/** POST /v1/billing/checkout — create Stripe checkout session */
export async function checkout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    const url = await createCheckoutSession(userId);
    res.json({ url });
  } catch (err) {
    next(err);
  }
}

/** POST /v1/billing/portal — create Stripe customer portal session */
export async function portal(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    const url = await createPortalSession(userId);
    res.json({ url });
  } catch (err) {
    next(err);
  }
}

/** GET /v1/billing/status — current plan + subscription info */
export async function status(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    const data = await getBillingStatus(userId);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /v1/billing/webhook — Stripe webhook
 * Mounted BEFORE express.json(), so req.body is a Buffer.
 */
export async function webhook(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const sig = req.headers["stripe-signature"] as string;
    if (!sig) {
      return next(AppError.badRequest("Missing stripe-signature header"));
    }

    // req.body is a Buffer here because of express.raw() in app.ts
    await handleWebhook(req.body as Buffer, sig);
    res.json({ received: true });
  } catch (err) {
    next(err);
  }
}
