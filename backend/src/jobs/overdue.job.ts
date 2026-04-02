// src/jobs/overdue.job.ts — Mark SENT invoices as OVERDUE daily

import cron from "node-cron";
import prisma from "../lib/prisma";

/**
 * Runs at midnight every day.
 * Finds all SENT invoices whose dueDate has passed and marks them OVERDUE.
 */
export function startOverdueJob(): void {
  cron.schedule("0 0 * * *", async () => {
    try {
      const now = new Date();
      const updated = await prisma.invoice.updateMany({
        where: {
          status: "SENT",
          dueDate: { lt: now },
        },
        data: { status: "OVERDUE" },
      });
      if (updated.count > 0) {
        console.log(`[overdue-job] Marked ${updated.count} invoice(s) as OVERDUE`);
      }
    } catch (err) {
      console.error("[overdue-job] Error:", err);
    }
  });

  console.log("[overdue-job] Scheduled (runs daily at midnight)");
}
