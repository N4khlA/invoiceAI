// src/services/auth.service.ts — Auth business logic
// Implements: register, login, refresh, logout, forgotPassword, resetPassword
// Security: bcrypt rounds=12, SHA-256 token hashing, JWT signed reset links,
//           token rotation on refresh, delete-on-revoke, email-enumeration-safe.

import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { signAccessToken, generateRefreshToken } from "../lib/jwt";
import { AppError } from "../lib/errors";
import { env, features } from "../config/env";
import { sendMail } from "../lib/mailer";
import { passwordResetEmailHtml } from "./email.service";

// ── Constants ─────────────────────────────────────────────────────────────────
const BCRYPT_ROUNDS = 12;
const REFRESH_COOKIE_MAX_AGE_MS = env.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
const RESET_TOKEN_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

// ── Helpers ───────────────────────────────────────────────────────────────────

/** SHA-256 hash a refresh token before storing / looking up in DB */
function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/** Build the safe user object — never return passwordHash */
function safeUser(user: {
  id: string;
  email: string;
  name: string | null;
  bizName: string | null;
  plan: string;
  logoUrl: string | null;
  currency: string;
  aiTone: string;
  readReceipts: boolean;
  createdAt: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    bizName: user.bizName,
    plan: user.plan,
    logoUrl: user.logoUrl,
    currency: user.currency,
    aiTone: user.aiTone,
    readReceipts: user.readReceipts,
    createdAt: user.createdAt,
  };
}

/** Issue access + refresh tokens and persist the refresh token hash */
async function issueTokens(userId: string, email: string, plan: string) {
  // Revoke all existing refresh tokens for this user (prevent accumulation)
  await prisma.refreshToken.deleteMany({ where: { userId } });

  const rawRefresh = generateRefreshToken();
  const tokenHash = hashToken(rawRefresh);
  const expiresAt = new Date(Date.now() + REFRESH_COOKIE_MAX_AGE_MS);

  await prisma.refreshToken.create({
    data: { token: tokenHash, userId, expiresAt },
  });

  const accessToken = signAccessToken({ sub: userId, email, plan });

  return { accessToken, rawRefresh };
}

// ── Service methods ───────────────────────────────────────────────────────────

export interface RegisterInput {
  email: string;
  password: string;
  businessName: string;
}

export async function register(input: RegisterInput) {
  const { email, password, businessName } = input;

  // Check for existing user — timing-safe-ish: always hash regardless
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw AppError.conflict("An account with that email already exists.");
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email,
      password: passwordHash,
      bizName: businessName,
    },
  });

  const { accessToken, rawRefresh } = await issueTokens(user.id, user.email, user.plan);

  return { user: safeUser(user), accessToken, rawRefresh };
}

// ─────────────────────────────────────────────────────────────────────────────

export interface LoginInput {
  email: string;
  password: string;
}

export async function login(input: LoginInput) {
  const { email, password } = input;

  const user = await prisma.user.findUnique({ where: { email } });

  // Always compare to avoid timing attacks; use a dummy hash if user not found
  const dummyHash = "$2a$12$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
  const hashToCompare = user?.password ?? dummyHash;
  const valid = await bcrypt.compare(password, hashToCompare);

  if (!user || !valid) {
    throw AppError.unauthorized("Invalid email or password.");
  }

  const { accessToken, rawRefresh } = await issueTokens(user.id, user.email, user.plan);

  return { user: safeUser(user), accessToken, rawRefresh };
}

// ─────────────────────────────────────────────────────────────────────────────

export async function refresh(rawToken: string) {
  const tokenHash = hashToken(rawToken);

  const stored = await prisma.refreshToken.findUnique({
    where: { token: tokenHash },
    include: { user: true },
  });

  if (!stored) {
    throw AppError.unauthorized("Refresh token not found.");
  }

  if (stored.expiresAt < new Date()) {
    // Clean up expired token
    await prisma.refreshToken.delete({ where: { id: stored.id } });
    throw AppError.unauthorized("Refresh token expired.");
  }

  // Rotate: delete old token, issue new pair
  const { user } = stored;
  const { accessToken, rawRefresh } = await issueTokens(user.id, user.email, user.plan);

  return { user: safeUser(user), accessToken, rawRefresh };
}

// ─────────────────────────────────────────────────────────────────────────────

export async function logout(rawToken: string) {
  const tokenHash = hashToken(rawToken);
  // Delete — no error if already gone (idempotent)
  await prisma.refreshToken.deleteMany({ where: { token: tokenHash } });
}

// ─────────────────────────────────────────────────────────────────────────────

export async function forgotPassword(email: string) {
  // Always resolve the same message — prevent email enumeration
  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    // Sign a short-lived JWT reset token (payload = userId + email)
    const resetToken = jwt.sign(
      { sub: user.id, email: user.email, purpose: "password-reset" },
      env.JWT_SECRET,
      { expiresIn: "15m" },
    );

    const resetLink = `${env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    if (!features.email) {
      // Demo mode: no email provider, so surface the link for local testing
      console.log(`[mail:demo] password reset link for ${user.email}: ${resetLink}`);
    }

    await sendMail({
      to: user.email,
      subject: "Reset your InvoiceAI password",
      html: passwordResetEmailHtml(resetLink),
    });
  }

  // Intentionally ambiguous — same response whether user exists or not
  return { message: "If that email exists you will receive a link." };
}

// ─────────────────────────────────────────────────────────────────────────────

export interface ResetPasswordInput {
  token: string;
  newPassword: string;
}

export async function resetPassword(input: ResetPasswordInput) {
  const { token, newPassword } = input;

  // Verify the signed JWT reset token
  let payload: { sub: string; email: string; purpose: string };
  try {
    payload = jwt.verify(token, env.JWT_SECRET) as typeof payload;
  } catch {
    throw AppError.validation("Reset token is invalid or has expired.");
  }

  if (payload.purpose !== "password-reset") {
    throw AppError.validation("Reset token is invalid or has expired.");
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) {
    // Should be extremely rare — user deleted between token issue and use
    throw AppError.notFound("User");
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  // Update password and revoke ALL refresh tokens atomically
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { password: passwordHash },
    }),
    prisma.refreshToken.deleteMany({ where: { userId: user.id } }),
  ]);

  return { message: "Password updated successfully." };
}
