"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, CreditCard, ExternalLink, Sparkles } from "lucide-react";
import { api, extractError } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import type { AuthUser, BillingStatus } from "@/types";
import { cn } from "@/lib/formatters";
import { Badge, Button, Card, CardHeader, ErrorState, Page, PageHeader, Skeleton, toast } from "@/components/ui";

const FREE_INVOICE_LIMIT = 5;

const PLANS = [
  {
    id: "FREE" as const,
    name: "Free",
    price: "$0",
    blurb: "For getting started",
    features: ["5 invoices per month", "Unlimited clients", "AI-written reminders", "Client view links & read receipts", "PDF export"],
  },
  {
    id: "PRO" as const,
    name: "Pro",
    price: "$12",
    blurb: "For busy freelancers",
    features: ["Unlimited invoices", "Everything in Free", "Cancel anytime"],
  },
];

function UsageMeter({ used }: { used: number }) {
  const pct = Math.min((used / FREE_INVOICE_LIMIT) * 100, 100);
  const full = used >= FREE_INVOICE_LIMIT;
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between text-sm">
        <span className="font-medium text-foreground">Invoices this month</span>
        <span className="tabular text-muted-foreground">
          <span className="font-semibold text-foreground">{used}</span> / {FREE_INVOICE_LIMIT}
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label="Invoices used this month"
        aria-valuemin={0}
        aria-valuemax={FREE_INVOICE_LIMIT}
        aria-valuenow={used}
      >
        <div className={cn("h-full rounded-full transition-[width] duration-500", full ? "bg-destructive" : pct >= 80 ? "bg-warning" : "bg-primary")} style={{ width: `${pct}%` }} />
      </div>
      <p className={cn("mt-2 text-xs", full ? "font-medium text-destructive" : "text-muted-foreground")}>
        {full ? "Limit reached — upgrade to keep invoicing this month." : `${FREE_INVOICE_LIMIT - used} left · resets on the 1st`}
      </p>
    </div>
  );
}

function BillingContent() {
  const router = useRouter();
  const params = useSearchParams();
  const updateUser = useAuthStore((s) => s.updateUser);
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState<"checkout" | "portal" | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [{ data: billing }, { data: account }] = await Promise.all([
        api.get<BillingStatus>("/billing/status"),
        api.get<AuthUser>("/account"),
      ]);
      setStatus(billing);
      updateUser(account);
    } catch (err) {
      setError(extractError(err));
    }
  }, [updateUser]);

  useEffect(() => {
    void load();
  }, [load]);

  // Messages after returning from Stripe (or the demo-mode simulation)
  useEffect(() => {
    const checkout = params.get("checkout");
    const portal = params.get("portal");
    if (!checkout && !portal) return;
    if (checkout === "success" || checkout === "demo") toast("Welcome to Pro! Unlimited invoices unlocked.");
    else if (checkout === "cancel") toast("Checkout cancelled — you're still on Free.", "info");
    else if (portal === "demo") toast("Demo mode: subscription cancelled, back on Free.", "info");
    router.replace("/billing");
  }, [params, router]);

  const go = async (kind: "checkout" | "portal") => {
    setRedirecting(kind);
    try {
      const { data } = await api.post<{ url: string }>(`/billing/${kind}`);
      window.location.href = data.url;
    } catch (err) {
      toast(extractError(err), "error");
      setRedirecting(null);
    }
  };

  if (error) return <ErrorState message={error} onRetry={load} />;

  const isPro = status?.plan === "PRO";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Current plan" />
        <div className="grid gap-6 p-5 sm:grid-cols-[1fr_auto] sm:items-center">
          {!status ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            <>
              <div className="flex items-center gap-4">
                <span className={cn("flex size-12 items-center justify-center rounded-xl", isPro ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                  {isPro ? <Sparkles className="size-6" aria-hidden /> : <CreditCard className="size-6" aria-hidden />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-xl font-bold text-foreground">
                    {isPro ? "Pro" : "Free"}
                    {status.subscriptionStatus && isPro && (
                      <Badge className="ml-2 border-success/30 bg-success/10 align-middle font-sans text-success">{status.subscriptionStatus}</Badge>
                    )}
                  </p>
                  {isPro ? (
                    <p className="text-sm text-muted-foreground">Unlimited invoices · $12/month</p>
                  ) : (
                    <div className="mt-3 max-w-sm">
                      <UsageMeter used={status.invoicesThisMonth} />
                    </div>
                  )}
                </div>
              </div>
              {isPro ? (
                <Button variant="outline" onClick={() => go("portal")} loading={redirecting === "portal"}>
                  {redirecting !== "portal" && <ExternalLink aria-hidden />}
                  Manage subscription
                </Button>
              ) : (
                <Button onClick={() => go("checkout")} loading={redirecting === "checkout"}>
                  {redirecting !== "checkout" && <Sparkles aria-hidden />}
                  Upgrade to Pro
                </Button>
              )}
            </>
          )}
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {PLANS.map((plan) => {
          const current = status?.plan === plan.id;
          const featured = plan.id === "PRO";
          return (
            <Card key={plan.id} className={cn("relative flex flex-col p-6", featured && "border-primary/50 ring-1 ring-primary/20")}>
              {featured && <Badge className="absolute right-5 top-5 border-primary/30 bg-primary/10 text-primary">Most popular</Badge>}
              <h2 className="font-display text-lg font-bold text-foreground">{plan.name}</h2>
              <p className="text-sm text-muted-foreground">{plan.blurb}</p>
              <p className="mt-5">
                <span className="tabular font-display text-4xl font-bold text-foreground">{plan.price}</span>
                <span className="text-sm text-muted-foreground"> / month</span>
              </p>
              <ul className="mt-6 flex-1 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-foreground">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                {current ? (
                  <Button variant="secondary" className="w-full" disabled>
                    Your current plan
                  </Button>
                ) : featured ? (
                  <Button className="w-full" onClick={() => go("checkout")} loading={redirecting === "checkout"} disabled={!status}>
                    Upgrade to Pro
                  </Button>
                ) : (
                  <Button variant="outline" className="w-full" onClick={() => go("portal")} loading={redirecting === "portal"} disabled={!status}>
                    Downgrade
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
      <p className="text-center text-xs text-muted-foreground">Payments are processed securely by Stripe. Prices in USD.</p>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Page className="max-w-4xl">
      <PageHeader title="Billing" description="Your plan and usage." />
      <Suspense>
        <BillingContent />
      </Suspense>
    </Page>
  );
}
