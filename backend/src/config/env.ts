// src/config/env.ts — Zod-validated environment variables

import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  DATABASE_URL:               z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET:                 z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRY:                 z.string().default("15m"),
  REFRESH_TOKEN_EXPIRY_DAYS:  z.coerce.number().positive().default(7),
  RESEND_API_KEY:             z.string().min(1, "RESEND_API_KEY is required"),
  EMAIL_FROM:                 z.string().email("EMAIL_FROM must be a valid email"),
  OPENAI_API_KEY:             z.string().min(1, "OPENAI_API_KEY is required"),
  STRIPE_SECRET_KEY:          z.string().min(1, "STRIPE_SECRET_KEY is required"),
  STRIPE_WEBHOOK_SECRET:      z.string().min(1, "STRIPE_WEBHOOK_SECRET is required"),
  STRIPE_PRO_PRICE_ID:        z.string().min(1, "STRIPE_PRO_PRICE_ID is required"),
  FRONTEND_URL:               z.string().url("FRONTEND_URL must be a valid URL"),
  PORT:                       z.coerce.number().default(3001),
  NODE_ENV:                   z.enum(["development", "production", "test"]).default("development"),
});

const _parsed = envSchema.safeParse(process.env);

if (!_parsed.success) {
  console.error("❌  Invalid environment variables:\n");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _parsed.error.issues.forEach((e: any) => {
    console.error(`  ${(e.path as string[]).join(".")}: ${e.message}`);
  });
  process.exit(1);
}

export const env = _parsed.data;
export type Env = typeof env;
