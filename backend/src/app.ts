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
import publicViewRoutes from "./routes/publicView.routes";
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

  // ── Behind a reverse proxy (nginx/ingress) rate limits must key on
  //    X-Forwarded-For, otherwise every client shares one bucket ───
  app.set("trust proxy", 1);

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
  // Public client-facing invoice view: dedicated router with a single
  // "/:token" route so it can never be shadowed by the authenticated
  // "/:id" route (Express strips mount prefixes — the original bug),
  // rate-limited here because it sits before the /v1 apiLimiter.
  app.use("/v1/invoices/view", apiLimiter, publicViewRoutes);

  // ── Global rate limiter for authenticated routes ──────────────
  app.use("/v1", apiLimiter);

  // ── Billing: rate-limited by the line above, authenticated at
  //    router level so Stripe /webhook stays public (raw body above) ─
  app.use("/v1/billing",       billingRoutes);

  // ── Global auth guard for all remaining /v1/* ─────────────────
  app.use("/v1", authenticate);

  // ── Authenticated routes ──────────────────────────────────────
  app.use("/v1/clients",    clientRoutes);
  app.use("/v1/invoices",   invoiceRoutes);
  app.use("/v1/ai",         aiRoutes);
  app.use("/v1/dashboard",  dashRoutes);
  app.use("/v1/account",    accountRoutes);

  // ── JSON 404 for unmatched routes (never HTML) ────────────────
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: { code: "NOT_FOUND", message: `Route ${req.method} ${req.originalUrl} not found` },
    });
  });

  // ── Global error handler (MUST be last) ──────────────────────
  app.use(errorHandler);

  return app;
}
