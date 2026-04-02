// src/routes/dashboard.routes.ts

import { Router } from "express";
import { summary } from "../controllers/dashboard.controller";

const router = Router();

// GET /v1/dashboard/summary
router.get("/summary", summary);

export default router;
