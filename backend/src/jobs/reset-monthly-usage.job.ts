// src/jobs/reset-monthly-usage.job.ts
// Runs on the 1st of every month at 00:01 UTC.
// Resets invoicesThisMonth counter for all users so plan limits restart fresh.

import cron from "node-cron";
import prisma from "../lib/prisma";

export function startResetMonthlyUsageJob(): void {
  // "1 0 1 * *" = 00:01 on the 1st day of every month
  cron.schedule("1 0 1 * *", async () => {
    try {
      const result = await prisma.user.updateMany({
        data: { invoicesThisMonth: 0 },
      });
      console.log(`[reset-monthly-usage-job] Reset counters for ${result.count} user(s)`);
    } catch (err) {
      console.error("[reset-monthly-usage-job] Error:", err);
    }
  });

  console.log("[reset-monthly-usage-job] Scheduled (runs on the 1st of each month at 00:01 UTC)");
}
