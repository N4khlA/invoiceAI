"use client";

import { useState, useEffect } from "react";
import {
  CreditCard,
  Zap,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Calendar,
  FileText,
  ArrowUpRight,
  Shield,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { api, extractError } from "@/lib/api";
import { Plan } from "@/types";
import { cn } from "@/lib/formatters";

// ─── Constants ────────────────────────────────────────────────────────────────

const FREE_INVOICE_LIMIT = 5;
const FREE_FOLLOWUP_LIMIT = 5;
const PRO_FOLLOWUP_LIMIT = 20;

// ─── Shared helpers ───────────────────────────────────────────────────────────

function InlineError({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-400">
      <AlertCircle className="h-4 w-4 shrink-0" />
      {message}
    </div>
  );
}

// ─── Plan Badge ───────────────────────────────────────────────────────────────

function PlanBadge({ plan }: { plan: Plan }) {
  if (plan === "PRO") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/15 px-3 py-1 text-xs font-semibold text-indigo-400 ring-1 ring-indigo-500/30">
        <Zap className="h-3 w-3" />
        PRO
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground ring-1 ring-border">
      FREE
    </span>
  );
}

// ─── Invoice Usage Meter (FREE only) ──────────────────────────────────────────

function InvoiceUsageMeter({
  used,
  limit,
}: {
  used: number;
  limit: number;
}) {
  const pct = Math.min((used / limit) * 100, 100);
  const isFull = used >= limit;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          <span className={cn("font-semibold", isFull ? "text-red-400" : "text-foreground")}>
            {used}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-foreground">{limit}</span>{" "}
          invoices used this month
        </span>
        <span
          className={cn(
            "text-xs font-medium tabular-nums",
            isFull ? "text-red-400" : "text-muted-foreground"
          )}
        >
          {Math.round(pct)}%
        </span>
      </div>
      {/* Progress bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            isFull ? "bg-red-500" : "bg-indigo-500"
          )}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={used}
          aria-valuemin={0}
          aria-valuemax={limit}
        />
      </div>
      {isFull && (
        <p className="text-xs text-red-400">
          Monthly limit reached — upgrade to Pro for unlimited invoices.
        </p>
      )}
    </div>
  );
}

// ─── Section 1 — Plan Card ────────────────────────────────────────────────────

function PlanCard() {
  const user = useAuthStore((s) => s.user);

  if (!user) return null;

  const { plan, invoicesThisMonth, planExpiresAt } = user;
  const isPro = plan === "PRO";

  const formatPeriodEnd = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-6 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <CreditCard className="h-4.5 w-4.5 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-foreground">Current Plan</h2>
          <p className="text-xs text-muted-foreground">Your active subscription</p>
        </div>
        <PlanBadge plan={plan} />
      </div>

      {/* Body */}
      <div className="px-6 py-5 space-y-4">
        {isPro ? (
          /* PRO — show renewal date */
          <div className="flex items-center gap-3 rounded-lg border border-indigo-500/20 bg-indigo-500/5 px-4 py-3.5">
            <Calendar className="h-4.5 w-4.5 shrink-0 text-indigo-400" />
            <div>
              <p className="text-sm font-medium text-foreground">Active subscription</p>
              {planExpiresAt ? (
                <p className="text-xs text-muted-foreground">
                  Renews{" "}
                  <span className="font-semibold text-foreground">
                    {formatPeriodEnd(planExpiresAt)}
                  </span>
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">Billed monthly</p>
              )}
            </div>
          </div>
        ) : (
          /* FREE — show invoice meter */
          <InvoiceUsageMeter used={invoicesThisMonth} limit={FREE_INVOICE_LIMIT} />
        )}
      </div>
    </div>
  );
}

// ─── Section 2 — Pricing Table (FREE only) ────────────────────────────────────

type TableRow = {
  feature: string;
  free: string | boolean;
  pro: string | boolean;
};

const ROWS: TableRow[] = [
  { feature: "Invoices / month", free: "5", pro: "Unlimited" },
  { feature: "AI follow-ups / day", free: String(FREE_FOLLOWUP_LIMIT), pro: String(PRO_FOLLOWUP_LIMIT) },
  { feature: "PDF export", free: true, pro: true },
  { feature: "Email sending", free: true, pro: true },
  { feature: "Priority support", free: false, pro: true },
];

function FeatureValue({ value }: { value: string | boolean }) {
  if (typeof value === "boolean") {
    return value ? (
      <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" aria-label="Included" />
    ) : (
      <XCircle className="h-4 w-4 text-muted-foreground/40 mx-auto" aria-label="Not included" />
    );
  }
  return <span className="text-sm font-medium text-foreground">{value}</span>;
}

function PricingTable({ plan }: { plan: Plan }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (plan === "PRO") return null;

  const handleUpgrade = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post<{ url: string }>("/billing/checkout");
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(extractError(err));
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-6 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <Zap className="h-4.5 w-4.5 text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">Upgrade to Pro</h2>
          <p className="text-xs text-muted-foreground">Unlock unlimited invoices and more</p>
        </div>
      </div>

      {/* Pricing table */}
      <div className="px-6 py-5 space-y-5">
        {error && <InlineError message={error} />}

        <div className="overflow-hidden rounded-lg border border-border">
          {/* Column headers */}
          <div className="grid grid-cols-3 border-b border-border bg-muted/40 px-4 py-2.5">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Feature
            </span>
            <span className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Free
            </span>
            <span className="text-center text-xs font-semibold text-indigo-400 uppercase tracking-wide">
              Pro
            </span>
          </div>

          {/* Rows */}
          {ROWS.map((row, idx) => (
            <div
              key={row.feature}
              className={cn(
                "grid grid-cols-3 items-center px-4 py-3",
                idx < ROWS.length - 1 && "border-b border-border"
              )}
            >
              <span className="text-sm text-foreground">{row.feature}</span>
              <div className="text-center">
                <FeatureValue value={row.free} />
              </div>
              <div className="text-center">
                <FeatureValue value={row.pro} />
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={handleUpgrade}
          disabled={loading}
          className={cn(
            "relative w-full rounded-lg px-4 py-3 text-sm font-semibold transition-all",
            "bg-indigo-600 text-white hover:bg-indigo-500 focus-visible:outline-none",
            "focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
            "focus-visible:ring-offset-card disabled:opacity-60 disabled:cursor-not-allowed",
            "shadow-sm shadow-indigo-900/30"
          )}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Redirecting…
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              Upgrade to Pro — $12/mo
              <ArrowUpRight className="h-4 w-4" />
            </span>
          )}
        </button>

        <p className="text-center text-xs text-muted-foreground">
          Billed monthly. Cancel anytime from the Stripe portal.
        </p>
      </div>
    </div>
  );
}

// ─── Section 3 — Manage Subscription (PRO only) ───────────────────────────────

function ManageSubscription({ plan }: { plan: Plan }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (plan !== "PRO") return null;

  const handlePortal = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post<{ url: string }>("/billing/portal");
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(extractError(err));
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-6 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <Shield className="h-4.5 w-4.5 text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">Manage Subscription</h2>
          <p className="text-xs text-muted-foreground">
            Update billing, payment method, or cancel via Stripe
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-5 space-y-4">
        {error && <InlineError message={error} />}

        <p className="text-sm text-muted-foreground">
          Cancellations and plan changes are handled securely inside the Stripe customer portal.
          Your Pro access remains active until the end of the billing period.
        </p>

        <button
          onClick={handlePortal}
          disabled={loading}
          className={cn(
            "flex items-center gap-2 rounded-lg border border-border bg-background",
            "px-4 py-2.5 text-sm font-semibold text-foreground transition-all",
            "hover:bg-muted hover:border-primary/40 focus-visible:outline-none",
            "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
            "focus-visible:ring-offset-card disabled:opacity-60 disabled:cursor-not-allowed"
          )}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Opening portal…
            </>
          ) : (
            <>
              <ArrowUpRight className="h-4 w-4" />
              Manage Subscription
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function BillingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Plan card skeleton */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-3 border-b border-border px-6 py-4">
          <div className="h-9 w-9 rounded-lg bg-muted" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-24 rounded bg-muted" />
            <div className="h-2.5 w-40 rounded bg-muted" />
          </div>
          <div className="h-6 w-14 rounded-full bg-muted" />
        </div>
        <div className="px-6 py-5 space-y-3">
          <div className="flex justify-between">
            <div className="h-3 w-40 rounded bg-muted" />
            <div className="h-3 w-8 rounded bg-muted" />
          </div>
          <div className="h-2 w-full rounded-full bg-muted" />
        </div>
      </div>

      {/* Table skeleton */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-3 border-b border-border px-6 py-4">
          <div className="h-9 w-9 rounded-lg bg-muted" />
          <div className="space-y-1.5">
            <div className="h-3 w-28 rounded bg-muted" />
            <div className="h-2.5 w-44 rounded bg-muted" />
          </div>
        </div>
        <div className="px-6 py-5 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-4">
              <div className="h-3 flex-1 rounded bg-muted" />
              <div className="h-3 w-12 rounded bg-muted" />
              <div className="h-3 w-12 rounded bg-muted" />
            </div>
          ))}
          <div className="h-10 w-full rounded-lg bg-muted mt-2" />
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BillingPage() {
  const user = useAuthStore((s) => s.user);
  const [isLoading, setIsLoading] = useState(true);

  // Simulate a brief hydration / store-rehydration wait so the skeleton shows
  // if the store hasn't rehydrated yet (sessionStorage is synchronous so this
  // resolves on the next tick in practice).
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 350);
    return () => clearTimeout(timer);
  }, []);

  // If user data still missing after hydration, show generic error
  const hasUser = Boolean(user);
  const plan: Plan = user?.plan ?? "FREE";

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-2xl px-6 py-8">
        {/* Page header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Billing</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage your plan and subscription
          </p>
        </div>

        {isLoading ? (
          <BillingSkeleton />
        ) : !hasUser ? (
          <InlineError message="Unable to load billing information. Please refresh the page." />
        ) : (
          <div className="space-y-6">
            {/* Section 1 — Plan Card */}
            <PlanCard />

            {/* Section 2 — Pricing Table (FREE only) */}
            <PricingTable plan={plan} />

            {/* Section 3 — Manage Subscription (PRO only) */}
            <ManageSubscription plan={plan} />
          </div>
        )}
      </div>
    </div>
  );
}
