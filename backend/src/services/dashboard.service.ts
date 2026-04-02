// src/services/dashboard.service.ts
// All queries are strictly scoped to userId — no cross-tenant leaks.

import { InvoiceStatus } from "@prisma/client";
import prisma from "../lib/prisma";

// ── Date helpers ─────────────────────────────────────────────────────────────

function startOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1);
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, n: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + n, 1);
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                     "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ── Service ───────────────────────────────────────────────────────────────────

export async function getDashboardSummary(userId: string) {
  const now = new Date();
  const ytdStart = startOfYear(now);
  const monthStart = startOfMonth(now);

  // Same period last year
  const lastYtdStart = new Date(now.getFullYear() - 1, 0, 1);
  const lastYtdEnd   = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

  // ── Run independent aggregates in parallel ────────────────────────────────
  const [
    revenueYtdAgg,
    outstandingAgg,
    overdueCountResult,
    paidThisMonthAgg,
    lastYearAgg,
    recentInvoices,
    overdueInvoices,
  ] = await Promise.all([
    // Revenue YTD (PAID invoices this calendar year)
    prisma.invoice.aggregate({
      where: {
        userId,
        status: InvoiceStatus.PAID,
        paidAt: { gte: ytdStart },
      },
      _sum: { total: true },
    }),

    // Outstanding (SENT + VIEWED + OVERDUE)
    prisma.invoice.aggregate({
      where: {
        userId,
        status: { in: [InvoiceStatus.SENT, InvoiceStatus.VIEWED, InvoiceStatus.OVERDUE] },
      },
      _sum: { total: true },
    }),

    // Overdue count
    prisma.invoice.count({
      where: { userId, status: InvoiceStatus.OVERDUE },
    }),

    // Paid this calendar month
    prisma.invoice.aggregate({
      where: {
        userId,
        status: InvoiceStatus.PAID,
        paidAt: { gte: monthStart },
      },
      _sum: { total: true },
    }),

    // Revenue same period last year (for % change)
    prisma.invoice.aggregate({
      where: {
        userId,
        status: InvoiceStatus.PAID,
        paidAt: { gte: lastYtdStart, lte: lastYtdEnd },
      },
      _sum: { total: true },
    }),

    // Last 5 invoices (any status), include client name
    prisma.invoice.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { client: { select: { name: true } } },
    }),

    // All OVERDUE invoices with client name for the overdue list
    prisma.invoice.findMany({
      where: { userId, status: InvoiceStatus.OVERDUE },
      orderBy: { dueDate: "asc" },
      include: { client: { select: { name: true } } },
    }),
  ]);

  const revenueYtd     = revenueYtdAgg._sum.total ?? 0;
  const lastYearRevenue = lastYearAgg._sum.total ?? 0;

  // % change vs same period last year — returns 0 if no prior data
  let revenueYtdChange = 0;
  if (lastYearRevenue > 0) {
    revenueYtdChange = ((revenueYtd - lastYearRevenue) / lastYearRevenue) * 100;
  }

  // ── Revenue chart: last 6 calendar months ────────────────────────────────
  // Build month buckets from 5 months ago → current month
  const chartMonths: { month: string; amount: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const bucketStart = addMonths(monthStart, -i);
    const bucketEnd   = addMonths(monthStart, -i + 1);
    chartMonths.push({ month: MONTH_NAMES[bucketStart.getMonth()], amount: 0, _start: bucketStart, _end: bucketEnd } as typeof chartMonths[0] & { _start: Date; _end: Date });
  }

  // Fetch all PAID invoices in the 6-month window with one query
  const sixMonthsAgo = addMonths(monthStart, -5);
  const paidInWindow = await prisma.invoice.findMany({
    where: {
      userId,
      status: InvoiceStatus.PAID,
      paidAt: { gte: sixMonthsAgo },
    },
    select: { total: true, paidAt: true },
  });

  // Bucket each invoice into its month slot
  for (const inv of paidInWindow) {
    if (!inv.paidAt) continue;
    const bucket = (chartMonths as (typeof chartMonths[0] & { _start: Date; _end: Date })[]).find(
      (b) => (b as { _start: Date; _end: Date })._start <= inv.paidAt! && inv.paidAt! < (b as { _start: Date; _end: Date })._end,
    );
    if (bucket) bucket.amount += inv.total;
  }

  // Strip internal date props
  const revenueChart = chartMonths.map(({ month, amount }) => ({ month, amount }));

  // ── Shape overdue list ────────────────────────────────────────────────────
  const overdueList = overdueInvoices.map((inv) => {
    const daysOverdue = Math.max(0, Math.floor((now.getTime() - inv.dueDate.getTime()) / 86_400_000));
    return {
      id:            inv.id,
      invoiceNumber: inv.number,
      clientName:    inv.client.name,
      amount:        inv.total,
      dueDate:       inv.dueDate,
      daysOverdue,
    };
  });

  return {
    stats: {
      revenueYtd,
      outstandingAmount: outstandingAgg._sum.total ?? 0,
      overdueCount:      overdueCountResult,
      paidThisMonth:     paidThisMonthAgg._sum.total ?? 0,
      revenueYtdChange:  Math.round(revenueYtdChange * 100) / 100,
    },
    revenueChart,
    recentInvoices,
    overdueInvoices: overdueList,
  };
}
