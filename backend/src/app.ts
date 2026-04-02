// src/app.ts — Express application configuration

import express, { Application, Request, Response } from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { env } from "./config/env";

// Routes
import authRoutes     from "./routes/auth.routes";
import clientRoutes   from "./routes/client.routes";
import invoiceRoutes  from "./routes/invoice.routes";
import aiRoutes       from "./routes/ai.routes";
import dashRoutes     from "./routes/dashboard.routes";
import accountRoutes  from "./routes/account.routes";
import billingRoutes  from "./routes/billing.routes";

// Middleware
import { authenticate }  from "./middleware/authenticate";
import { errorHandler }  from "./middleware/errorHandler";
import { apiLimiter }    from "./middleware/rateLimiter";

export function createApp(): Application {
  const app = express();

  // ── Security headers ──────────────────────────────────────────
  app.use(helmet());

  // ── CORS ──────────────────────────────────────────────────────
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
    }),
  );

  // ── Stripe webhook — raw body MUST come before express.json() ─
  app.use(
    "/v1/billing/webhook",
    express.raw({ type: "application/json" }),
  );

  // ── Standard middleware ───────────────────────────────────────
  app.use(express.json({ limit: "2mb" }));
  app.use(cookieParser());
  app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

  // ── Health check ──────────────────────────────────────────────
  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // ── Public routes (no auth) ───────────────────────────────────
  app.use("/v1/auth",          authRoutes);
  app.use("/v1/billing",       billingRoutes);          // /webhook is public; other paths are auth'd below
  app.use("/v1/invoices/view", invoiceRoutes);          // /view/:token is public

  // ── Global rate limiter for authenticated routes ──────────────
  app.use("/v1", apiLimiter);

  // ── Global auth guard for all remaining /v1/* ─────────────────
  app.use("/v1", authenticate);

  // ── Authenticated routes ──────────────────────────────────────
  app.use("/v1/clients",    clientRoutes);
  app.use("/v1/invoices",   invoiceRoutes);
  app.use("/v1/ai",         aiRoutes);
  app.use("/v1/dashboard",  dashRoutes);
  app.use("/v1/account",    accountRoutes);

  // ── Global error handler (MUST be last) ──────────────────────
  app.use(errorHandler);

  return app;
}
