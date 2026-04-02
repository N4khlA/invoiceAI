// src/routes/billing.routes.ts
// IMPORTANT: The /webhook route is mounted BEFORE express.json() in app.ts via
// express.raw({ type: "application/json" }) at /v1/billing/webhook.

import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { checkout, portal, status, webhook } from "../controllers/billing.controller";

const router = Router();

// ── Public — no auth (Stripe calls this directly) ─────────────────────────────
// Note: express.raw() body parser is applied in app.ts before this route
router.post("/webhook", webhook);

// ── Authenticated ─────────────────────────────────────────────────────────────
router.use(authenticate);

router.post("/checkout", checkout);         // POST /v1/billing/checkout
router.post("/portal",   portal);           // POST /v1/billing/portal
router.get("/status",    status);           // GET  /v1/billing/status

export default router;
