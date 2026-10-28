"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { AlertTriangle, CheckCircle2, Clock, FileQuestion, Printer } from "lucide-react";
import { BASE_URL } from "@/lib/api";
import type { PublicInvoiceView } from "@/types";
import { cn, formatCurrency, formatDate, getDaysOverdue } from "@/lib/formatters";
import { Logo } from "@/components/Logo";
import { Button, Skeleton } from "@/components/ui";
import { InvoicePaper } from "@/components/invoices/InvoicePaper";

function daysUntil(iso: string) {
  const ms = new Date(iso).setHours(23, 59, 59) - Date.now();
  return Math.ceil(ms / 86_400_000);
}

function StatusBanner({ invoice }: { invoice: PublicInvoiceView }) {
  const total = formatCurrency(invoice.total, invoice.currency);
  if (invoice.status === "PAID") {
    return (
      <Banner tone="success" icon={CheckCircle2} title="Paid — thank you!" text={`This invoice for ${total} has been settled.`} />
    );
  }
  if (invoice.status === "VOID") {
    return <Banner tone="muted" icon={FileQuestion} title="This invoice was voided" text="No payment is due. Contact the sender if you have questions." />;
  }
  if (invoice.status === "OVERDUE") {
    const d = getDaysOverdue(invoice.dueDate);
    return <Banner tone="danger" icon={AlertTriangle} title={`${total} is ${d === 0 ? "due today" : `${d} day${d === 1 ? "" : "s"} overdue`}`} text={`It was due on ${formatDate(invoice.dueDate)}.`} />;
  }
  const d = daysUntil(invoice.dueDate);
  return (
    <Banner
      tone="info"
      icon={Clock}
      title={`${total} due ${d <= 0 ? "today" : d === 1 ? "tomorrow" : `in ${d} days`}`}
      text={`Please pay by ${formatDate(invoice.dueDate)}. Payment details are at the bottom of the invoice.`}
    />
  );
}

function Banner({ tone, icon: Icon, title, text }: { tone: "success" | "danger" | "info" | "muted"; icon: React.ElementType; title: string; text: string }) {
  return (
    <div
      role="status"
      className={cn(
        "no-print mb-6 flex items-start gap-3 rounded-xl border p-4",
        tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100",
        tone === "danger" && "border-red-200 bg-red-50 text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100",
        tone === "info" && "border-indigo-200 bg-indigo-50 text-indigo-950 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-100",
        tone === "muted" && "border-border bg-muted text-foreground"
      )}
    >
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-0.5 text-sm opacity-80">{text}</p>
      </div>
    </div>
  );
}

export default function PublicInvoicePage({ params }: { params: { token: string } }) {
  const [invoice, setInvoice] = useState<PublicInvoiceView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    axios
      .get<PublicInvoiceView>(`${BASE_URL}/invoices/view/${encodeURIComponent(params.token)}`)
      .then(({ data }) => setInvoice(data))
      .catch((err) =>
        setError(
          axios.isAxiosError(err) && err.response?.status === 404
            ? "This invoice link is invalid or no longer available."
            : "We couldn't load this invoice. Check your connection and try again."
        )
      );
  }, [params.token]);

  useEffect(() => {
    if (invoice) document.title = `Invoice ${invoice.number} from ${invoice.snapshotData?.business?.name ?? "InvoiceAI"}`;
  }, [invoice]);

  return (
    <div className="min-h-dvh bg-background">
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
        {error ? (
          <div className="flex flex-col items-center py-24 text-center">
            <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <FileQuestion className="size-7" aria-hidden />
            </div>
            <h1 className="text-xl font-bold text-foreground">Invoice not found</h1>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">{error}</p>
          </div>
        ) : !invoice ? (
          <div className="space-y-6" aria-busy="true" aria-label="Loading invoice">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-[600px] w-full rounded-xl" />
          </div>
        ) : (
          <>
            <StatusBanner invoice={invoice} />
            <div className="no-print mb-4 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer aria-hidden />
                Print or save PDF
              </Button>
            </div>
            <InvoicePaper
              number={invoice.number}
              status={invoice.status}
              issueDate={invoice.issueDate}
              dueDate={invoice.dueDate}
              currency={invoice.currency}
              items={invoice.items}
              subtotal={invoice.subtotal}
              taxAmount={invoice.taxAmount}
              total={invoice.total}
              notes={invoice.notes}
              terms={invoice.terms}
              business={invoice.snapshotData?.business ?? {}}
              client={invoice.snapshotData?.client ?? {}}
            />
          </>
        )}
        <footer className="no-print mt-10 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          Sent with
          <a href="/" className="rounded opacity-80 transition-opacity hover:opacity-100" aria-label="InvoiceAI">
            <Logo className="scale-90" />
          </a>
        </footer>
      </main>
    </div>
  );
}
