// src/controllers/auth.controller.ts
// Validates input with Zod, delegates to auth.service, manages HttpOnly cookies.

import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import {
  register as svcRegister,
  login as svcLogin,
  refresh as svcRefresh,
  logout as svcLogout,
  forgotPassword as svcForgotPassword,
  resetPassword as svcResetPassword,
} from "../services/auth.service";
import { env } from "../config/env";

// ── Cookie helpers ─────────────────────────────────────────────────────────────

const COOKIE_NAME = "refreshToken";
const COOKIE_MAX_AGE = env.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  });
}

// ── Zod schemas ────────────────────────────────────────────────────────────────

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
  .regex(/[0-9]/, "Password must contain at least one number.");

const registerSchema = z.object({
  email: z.string().email("Invalid email address."),
  password: passwordSchema,
  businessName: z.string().min(1, "Business name is required."),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address."),
  password: z.string().min(1, "Password is required."),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address."),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required."),
  newPassword: passwordSchema,
});

// ── Controller handlers ────────────────────────────────────────────────────────

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = registerSchema.parse(req.body);
    const { user, accessToken, rawRefresh } = await svcRegister(body);
    setRefreshCookie(res, rawRefresh);
    res.status(201).json({ user, accessToken });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = loginSchema.parse(req.body);
    const { user, accessToken, rawRefresh } = await svcLogin(body);
    setRefreshCookie(res, rawRefresh);
    res.status(200).json({ user, accessToken });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawToken: string | undefined = req.cookies?.[COOKIE_NAME];
    if (!rawToken) {
      res.status(401).json({ error: "No refresh token provided." });
      return;
    }
    const { user, accessToken, rawRefresh } = await svcRefresh(rawToken);
    setRefreshCookie(res, rawRefresh);
    res.status(200).json({ user, accessToken });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawToken: string | undefined = req.cookies?.[COOKIE_NAME];
    if (rawToken) {
      await svcLogout(rawToken);
    }
    clearRefreshCookie(res);
    res.status(200).json({ message: "Logged out successfully." });
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    const result = await svcForgotPassword(email);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = resetPasswordSchema.parse(req.body);
    const result = await svcResetPassword(body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
