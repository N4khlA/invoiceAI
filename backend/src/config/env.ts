// src/config/env.ts — Zod-validated environment variables

import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

// Treat "", unset and the .env.example placeholders ("sk-...", "re_...") as missing
const optionalKey = z
  .string()
  .optional()
  .transform((v) => (v && !v.endsWith("...") ? v : undefined));

const envSchema = z.object({
  DATABASE_URL:               z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET:                 z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRY:                 z.string().default("15m"),
  REFRESH_TOKEN_EXPIRY_DAYS:  z.coerce.number().positive().default(7),
  // Third-party keys are optional: when one is missing that integration
  // runs in demo mode (see `features` below) so the app works keyless.
  RESEND_API_KEY:             optionalKey,
  EMAIL_FROM:                 z.string().email("EMAIL_FROM must be a valid email").default("invoices@invoiceai.app"),
  OPENAI_API_KEY:             optionalKey,
  STRIPE_SECRET_KEY:          optionalKey,
  STRIPE_WEBHOOK_SECRET:      optionalKey,
  STRIPE_PRO_PRICE_ID:        optionalKey,
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

/** Which integrations are live. Anything false runs a local demo fallback. */
export const features = {
  email:   Boolean(env.RESEND_API_KEY),
  ai:      Boolean(env.OPENAI_API_KEY),
  billing: Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_PRO_PRICE_ID),
};
