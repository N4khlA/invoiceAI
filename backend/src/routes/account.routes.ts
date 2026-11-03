// src/routes/account.routes.ts

import { Router } from "express";
import { getAccount, updateAccount, changePassword, uploadLogo, deleteLogo } from "../controllers/account.controller";

const router = Router();

// All routes here are already protected by the global authenticate middleware in app.ts

// GET  /v1/account
router.get("/", getAccount);

// PATCH /v1/account
router.patch("/", updateAccount);

// PATCH /v1/account/password
router.patch("/password", changePassword);

// PUT/DELETE /v1/account/logo — inline PNG/JPEG/WebP, ≤ 512 KB
router.put("/logo",    uploadLogo);
router.delete("/logo", deleteLogo);

export default router;
