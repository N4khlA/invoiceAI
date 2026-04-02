// src/routes/ai.routes.ts

import { Router } from "express";
import { followUp } from "../controllers/ai.controller";
import { aiLimiter } from "../middleware/rateLimiter";

const router = Router();

// POST /v1/ai/follow-up — stricter rate limit for expensive GPT calls
router.post("/follow-up", aiLimiter, followUp);

export default router;
