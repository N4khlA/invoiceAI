"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, Clock, FileText, Plus, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { useDashboard } from "@/hooks/useDashboard";
import { useAuthStore } from "@/store/authStore";
import { cn, formatCurrency, formatDate } from "@/lib/formatters";
import { Button, Card, CardHeader, EmptyState, ErrorState, Page, PageHeader, Skeleton } from "@/components/ui";
import { InvoiceTable } from "@/components/invoices/InvoiceTable";
import { RevenueChart } from "@/components/dashboard/RevenueChart";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function StatTile({
  label,
  value,
  icon: Icon,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  hint?: React.ReactNode;
  tone?: "default" | "danger";
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span
          className={cn(
            "flex size-8 items-center justify-center rounded-lg",
            tone === "danger" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
          )}
        >
          <Icon className="size-4" aria-hidden />
        </span>
      </div>
      <p className="tabular mt-3 font-display text-2xl font-bold text-foreground sm:text-[26px]">{value}</p>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </Card>
  );
}

export default function DashboardPage() {
  const { data, isLoading, error, refetch } = useDashboard();
  const user = useAuthStore((s) => s.user);
  const currency = user?.currency ?? "USD";
  const firstName = user?.name?.split(" ")[0];

  if (error) {
    return (
      <Page>
        <ErrorState message={error} onRetry={refetch} />
      </Page>
    );
  }

  const change = data?.stats.revenueYtdChange ?? 0;
  const hasInvoices = (data?.recentInvoices.length ?? 0) > 0;

  return (
    <Page>
      <PageHeader
        title={`${greeting()}${firstName ? `, ${firstName}` : ""}`}
        description="Here's where your money stands today."
        actions={
          <Button asChild>
            <Link href="/invoices/new">
              <Plus aria-hidden />
              New invoice
            </Link>
          </Button>
        }
      />

      {/* Stat tiles */}
      <section aria-label="Key figures" className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 xl:grid-cols-4">
        {isLoading || !data ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="space-y-4 p-5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-7 w-32" />
            </Card>
          ))
        ) : (
          <>
            <StatTile
              label="Revenue this year"
              value={formatCurrency(data.stats.revenueYtd, currency)}
              icon={Wallet}
              hint={
                change !== 0 ? (
                  <span className={cn("inline-flex items-center gap-1 font-medium", change > 0 ? "text-success" : "text-destructive")}>
                    {change > 0 ? <TrendingUp className="size-3.5" aria-hidden /> : <TrendingDown className="size-3.5" aria-hidden />}
                    {change > 0 ? "+" : ""}
                    {change.toFixed(1)}% vs last year
                  </span>
                ) : (
                  "Paid invoices since Jan 1"
                )
              }
            />
            <StatTile label="Outstanding" value={formatCurrency(data.stats.outstandingAmount, currency)} icon={Clock} hint="Sent and awaiting payment" />
            <StatTile label="Collected this month" value={formatCurrency(data.stats.paidThisMonth, currency)} icon={CheckCircle2} hint="Marked as paid" />
            <StatTile
              label="Overdue"
              value={String(data.stats.overdueCount)}
              icon={AlertTriangle}
              tone={data.stats.overdueCount > 0 ? "danger" : "default"}
              hint={data.stats.overdueCount > 0 ? "Need a follow-up" : "Nothing late — nice"}
            />
          </>
        )}
      </section>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Revenue collected" description="Paid invoices, last 6 months" />
          <div className="px-3 pb-4 pt-5 sm:px-5">
            {isLoading || !data ? <Skeleton className="h-[240px] w-full" /> : <RevenueChart data={data.revenueChart} currency={currency} />}
          </div>
        </Card>

        <Card className="flex flex-col">
          <CardHeader title="Needs attention" description="Overdue invoices" />
          {isLoading || !data ? (
            <div className="space-y-3 p-5">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : data.overdueInvoices.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="All caught up" description="No overdue invoices right now." className="flex-1 py-10" />
          ) : (
            <ul className="divide-y divide-border">
              {data.overdueInvoices.slice(0, 5).map((inv) => (
                <li key={inv.id}>
                  <Link href={`/invoices/${inv.id}`} className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-muted/50">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{inv.clientName}</p>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-mono">{inv.invoiceNumber}</span> · due {formatDate(inv.dueDate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="tabular text-sm font-semibold text-foreground">{formatCurrency(inv.amount, currency)}</p>
                      <p className="text-xs font-medium text-destructive">{inv.daysOverdue}d late</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-6 overflow-hidden">
        <CardHeader
          title="Recent invoices"
          action={
            hasInvoices ? (
              <Button asChild variant="ghost" size="sm">
                <Link href="/invoices">
                  View all
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            ) : undefined
          }
        />
        {!isLoading && !hasInvoices ? (
          <EmptyState
            icon={FileText}
            title="Create your first invoice"
            description="Add a client, list your work and send it — it takes about a minute."
            action={
              <Button asChild>
                <Link href="/invoices/new">
                  <Plus aria-hidden />
                  New invoice
                </Link>
              </Button>
            }
          />
        ) : (
          <InvoiceTable invoices={data?.recentInvoices ?? []} isLoading={isLoading} />
        )}
      </Card>
    </Page>
  );
}
