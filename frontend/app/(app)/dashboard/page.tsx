"use client";

import { useDashboard } from "@/hooks/useDashboard";
import { formatCurrency } from "@/lib/formatters";
import { InvoiceStatus } from "@/types";
import {
  DollarSign,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  FileText,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/formatters";

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  SENT: "bg-blue-500/15 text-blue-400",
  VIEWED: "bg-purple-500/15 text-purple-400",
  OVERDUE: "bg-red-500/15 text-red-400",
  PAID: "bg-emerald-500/15 text-emerald-400",
  VOID: "bg-zinc-500/15 text-zinc-400",
};

function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  className,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  trend?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-5 flex items-start justify-between",
        className
      )}
    >
      <div>
        <p className="text-sm text-muted-foreground mb-1">{label}</p>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        {trend && (
          <p className="text-xs text-emerald-400 flex items-center gap-1 mt-1">
            <TrendingUp className="h-3 w-3" />
            {trend}
          </p>
        )}
      </div>
      <div className="rounded-lg bg-primary/10 p-2.5">
        <Icon className="h-4 w-4 text-primary" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading, error } = useDashboard();

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-destructive text-sm">{error}</p>
      </div>
    );
  }

  // Format the YTD change as a trend label, e.g. "+12% vs last year"
  const revenueTrend =
    data?.stats.revenueYtdChange != null
      ? `${data.stats.revenueYtdChange >= 0 ? "+" : ""}${data.stats.revenueYtdChange.toFixed(1)}% vs last year`
      : undefined;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Overview of your invoicing activity
        </p>
      </div>

      {/* Stats grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-card p-5 h-28 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Revenue"
            value={formatCurrency(data?.stats.revenueYtd ?? 0)}
            icon={DollarSign}
            trend={revenueTrend}
          />
          <StatCard
            label="Outstanding"
            value={formatCurrency(data?.stats.outstandingAmount ?? 0)}
            icon={Clock}
          />
          <StatCard
            label="Collected This Month"
            value={formatCurrency(data?.stats.paidThisMonth ?? 0)}
            icon={CheckCircle}
          />
          <StatCard
            label="Overdue"
            value={String(data?.stats.overdueCount ?? 0)}
            icon={AlertTriangle}
          />
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent invoices */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Recent Invoices
            </h2>
            <Link
              href="/invoices"
              className="text-xs text-primary hover:underline flex items-center gap-0.5"
            >
              View all <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          {isLoading ? (
            <div className="space-y-px">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="px-5 py-3.5 h-12 animate-pulse bg-muted/20" />
              ))}
            </div>
          ) : (data?.recentInvoices?.length ?? 0) === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-6">
              <FileText className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No invoices yet.</p>
              <Link
                href="/invoices/new"
                className="mt-2 text-sm text-primary hover:underline"
              >
                Create your first invoice →
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {data?.recentInvoices?.map((inv) => (
                <li key={inv.id}>
                  <Link
                    href={`/invoices/${inv.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-accent transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {inv.client?.name ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {inv.invoiceNumber}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          STATUS_STYLES[inv.status]
                        )}
                      >
                        {inv.status}
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        {formatCurrency(inv.total)}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Overdue actions */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              Overdue — Needs Attention
            </h2>
          </div>
          {isLoading ? (
            <div className="space-y-px">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="px-5 py-3.5 h-14 animate-pulse bg-muted/20" />
              ))}
            </div>
          ) : (data?.overdueInvoices?.length ?? 0) === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-6">
              <CheckCircle className="h-8 w-8 text-emerald-400 mb-2" />
              <p className="text-sm text-muted-foreground">
                All caught up! No overdue invoices.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {data?.overdueInvoices?.map((inv) => (
                <li key={inv.id}>
                  <Link
                    href={`/invoices/${inv.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-accent transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {inv.clientName}
                      </p>
                      <p className="text-xs text-red-400">
                        Due {new Date(inv.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-red-400 shrink-0">
                      {formatCurrency(inv.amount)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
