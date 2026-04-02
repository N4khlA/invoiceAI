// src/__tests__/unit/dashboard.service.test.ts
// Unit tests for dashboard.service. All Prisma calls are mocked via setup.ts.

import { getDashboardSummary } from "../../services/dashboard.service";
import prisma from "../../lib/prisma";
import { InvoiceStatus } from "@prisma/client";

describe("Dashboard Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getSummary()", () => {
    it("returns correct revenueYtd", async () => {
      setupMocks({ revenueYtd: 5000, outstanding: 1200, overdueCount: 2 });
      const result = await getDashboardSummary("user-1");
      expect(result.stats.revenueYtd).toBe(5000);
    });

    it("returns correct outstandingAmount", async () => {
      setupMocks({ revenueYtd: 0, outstanding: 800, overdueCount: 1 });
      const result = await getDashboardSummary("user-1");
      expect(result.stats.outstandingAmount).toBe(800);
    });

    it("returns correct overdueCount", async () => {
      setupMocks({ revenueYtd: 0, outstanding: 0, overdueCount: 7 });
      const result = await getDashboardSummary("user-1");
      expect(result.stats.overdueCount).toBe(7);
    });

    it("revenueChart has exactly 6 months", async () => {
      setupMocks({ revenueYtd: 0, outstanding: 0, overdueCount: 0 });
      const result = await getDashboardSummary("user-1");
      expect(result.revenueChart).toHaveLength(6);
    });

    it("overdueInvoices includes daysOverdue calculated correctly", async () => {
      const DAY_MS = 86_400_000;
      // 3 days overdue
      const dueDate = new Date(Date.now() - DAY_MS * 3);

      // Override findMany to return an overdue invoice for this specific call
      (prisma.invoice.findMany as jest.Mock).mockImplementation(({ where }: { where: { status?: string } }) => {
        if (where?.status === InvoiceStatus.OVERDUE) {
          return Promise.resolve([
            {
              id: "inv-1",
              number: "INV-0001",
              dueDate,
              client: { name: "Client A" },
              total: 200,
            },
          ]);
        }
        // PAID invoices for chart
        return Promise.resolve([]);
      });

      // Aggregates
      (prisma.invoice.aggregate as jest.Mock).mockResolvedValue({ _sum: { total: 0 } });
      (prisma.invoice.count as jest.Mock).mockResolvedValue(0);

      const result = await getDashboardSummary("user-1");

      expect(result.overdueInvoices).toHaveLength(1);
      // daysOverdue should be 3 (±1 due to test execution timing is OK)
      expect(result.overdueInvoices[0].daysOverdue).toBeGreaterThanOrEqual(2);
      expect(result.overdueInvoices[0].daysOverdue).toBeLessThanOrEqual(4);
      expect(result.overdueInvoices[0].clientName).toBe("Client A");
    });
  });
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Set up a baseline set of Prisma mocks for getDashboardSummary.
 * Individual tests can override specific mocks after calling this.
 */
function setupMocks({
  revenueYtd,
  outstanding,
  overdueCount,
}: {
  revenueYtd: number;
  outstanding: number;
  overdueCount: number;
}) {
  // Aggregate: returns different values based on whether it's a "paid" query or "outstanding" query
  (prisma.invoice.aggregate as jest.Mock).mockImplementation(
    ({ where }: { where: { status?: unknown } }) => {
      if (where?.status && typeof where.status === "object" && "in" in (where.status as object)) {
        // Outstanding (SENT + VIEWED + OVERDUE)
        return Promise.resolve({ _sum: { total: outstanding } });
      }
      // YTD, this month, last year — all return revenueYtd for simplicity
      return Promise.resolve({ _sum: { total: revenueYtd } });
    }
  );

  (prisma.invoice.count as jest.Mock).mockResolvedValue(overdueCount);

  // findMany — return empty lists by default (no overdue, no recent, no chart invoices)
  (prisma.invoice.findMany as jest.Mock).mockResolvedValue([]);
}
