// src/routes/publicView.routes.ts
// Public client-facing invoice view — NO auth required.
//
// This router exists because mounting the whole invoice router at
// "/v1/invoices/view" shadowed "/:token" with the authenticated "/:id"
// route (Express strips the mount prefix), making every emailed client
// link return 401. It is mounted at /v1/invoices/view and rate-limited
// in app.ts BEFORE the global authenticate guard.

import { Router } from "express";
import {
  getPublicInvoice,
  payPublicInvoice,
  demoPayPublicInvoice,
} from "../controllers/invoice.controller";
import { paymentLimiter } from "../middleware/rateLimiter";

const router = Router();

router.get("/:token", getPublicInvoice);
// "Pay now" — own, tighter limit (see paymentLimiter)
router.post("/:token/pay",      paymentLimiter, payPublicInvoice);
router.post("/:token/demo-pay", paymentLimiter, demoPayPublicInvoice);

export default router;
