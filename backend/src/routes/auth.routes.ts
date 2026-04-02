// src/routes/auth.routes.ts
import { Router } from "express";
import { authLimiter } from "../middleware/rateLimiter";
import {
  register,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
} from "../controllers/auth.controller";

const router = Router();

router.post("/register",       authLimiter, register);
router.post("/login",          authLimiter, login);
router.post("/refresh",        authLimiter, refresh);
router.post("/logout",         logout);
router.post("/forgot-password", authLimiter, forgotPassword);
router.post("/reset-password",  authLimiter, resetPassword);

export default router;
