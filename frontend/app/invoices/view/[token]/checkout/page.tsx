"use client";

// Simulated checkout, used when the backend has no Stripe key. It never asks
// for real card details: the fields are filled with Stripe's public test card
// and locked, so nobody mistakes it for a real payment page.

import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { ArrowLeft, CreditCard, FlaskConical, Lock } from "lucide-react";
import { BASE_URL } from "@/lib/api";
import type { PublicInvoiceView } from "@/types";
import { formatCurrency } from "@/lib/formatters";
import { Button, Input, Label, Skeleton, toast } from "@/components/ui";

export default function DemoCheckoutPage({ params }: { params: { token: string } }) {
  const token = encodeURIComponent(params.token);
  const backHref = `/invoices/view/${token}`;
  const [invoice, setInvoice] = useState<PublicInvoiceView | null>(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    axios
      .get<PublicInvoiceView>(`${BASE_URL}/invoices/view/${token}`)
      .then(({ data }) => {
        // Live Stripe or nothing to pay: this page has no business being open
        if (!data.payable || data.paymentsLive) window.location.replace(backHref);
        else setInvoice(data);
      })
      .catch(() => window.location.replace(backHref));
  }, [token, backHref]);

  async function pay() {
    setPaying(true);
    try {
      await axios.post(`${BASE_URL}/invoices/view/${token}/demo-pay`);
      window.location.assign(`${backHref}?payment=success`);
    } catch {
      setPaying(false);
      toast("The demo payment failed. Please try again.", "error");
    }
  }

  const business = invoice?.snapshotData?.business?.name ?? "the sender";

  return (
    <div className="min-h-dvh bg-background">
      <main className="mx-auto w-full max-w-md px-4 py-10 sm:py-16">
        <Link
          href={backHref}
          className="mb-6 inline-flex cursor-pointer items-center gap-1.5 rounded text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to invoice
        </Link>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <div
            role="note"
            className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100"
          >
            <FlaskConical className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>
              <span className="font-semibold">Demo checkout.</span> Stripe isn&apos;t connected, so this simulates a
              card payment. No real card is charged.
            </p>
          </div>

          {!invoice ? (
            <div className="space-y-4" aria-busy="true" aria-label="Loading checkout">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Pay {business} · Invoice <span className="font-mono">{invoice.number}</span>
              </p>
              <p className="tabular mt-1 font-display text-3xl font-bold text-foreground">
                {formatCurrency(invoice.total, invoice.currency)}
              </p>

              <form
                className="mt-6 space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void pay();
                }}
              >
                <div className="space-y-1.5">
                  <Label htmlFor="card">Card number</Label>
                  <Input id="card" value="4242 4242 4242 4242" readOnly className="tabular font-mono" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="exp">Expiry</Label>
                    <Input id="exp" value="12 / 34" readOnly className="tabular font-mono" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cvc">CVC</Label>
                    <Input id="cvc" value="123" readOnly className="tabular font-mono" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Stripe&apos;s public test card, filled in for you.</p>

                <Button type="submit" size="lg" className="w-full" loading={paying}>
                  {!paying && <CreditCard aria-hidden />}
                  Pay {formatCurrency(invoice.total, invoice.currency)}
                </Button>
                <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                  <Lock className="size-3" aria-hidden />
                  Simulated: the invoice is marked paid, nothing else happens
                </p>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
