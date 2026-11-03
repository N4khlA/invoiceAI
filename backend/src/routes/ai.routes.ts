// src/routes/ai.routes.ts

import { Router } from "express";
import { followUp, invoiceText } from "../controllers/ai.controller";
import { aiLimiter } from "../middleware/rateLimiter";

const router = Router();

// POST /v1/ai/follow-up — stricter rate limit for expensive GPT calls
router.post("/follow-up", aiLimiter, followUp);

// POST /v1/ai/invoice-text — notes / payment terms for the invoice form
router.post("/invoice-text", aiLimiter, invoiceText);

export default router;
