// src/index.ts — Server entry point

import { createApp } from "./app";
import { env }       from "./config/env";
import prisma        from "./lib/prisma";
import { startOverdueJob }             from "./jobs/overdue.job";
import { startResetMonthlyUsageJob }   from "./jobs/reset-monthly-usage.job";

async function main() {
  // Validate DB connection on startup
  await prisma.$connect();
  console.log("✅  Database connected");

  // Start cron jobs
  startOverdueJob();
  startResetMonthlyUsageJob();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.log(`🚀  InvoiceAI backend running on http://localhost:${env.PORT}`);
    console.log(`    Environment: ${env.NODE_ENV}`);
  });

  // ── Graceful shutdown ─────────────────────────────────────────
  async function shutdown(signal: string) {
    console.log(`\n[${signal}] Shutting down gracefully...`);
    server.close(async () => {
      await prisma.$disconnect();
      console.log("Database disconnected. Bye!");
      process.exit(0);
    });
    // Force exit after 10 s if connections linger
    setTimeout(() => process.exit(1), 10_000);
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT",  () => shutdown("SIGINT"));
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
