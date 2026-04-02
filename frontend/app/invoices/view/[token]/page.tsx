"use client";

import { useEffect, useState } from "react";
import { Zap, Download, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { PublicInvoiceView } from "@/types";
import { cn } from "@/lib/formatters";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function fmt(n: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(n);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRow({ w = "w-full" }: { w?: string }) {
  return (
    <div className={cn("h-4 rounded animate-pulse bg-slate-200 dark:bg-slate-700", w)} />
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 py-8">
      <div className="space-y-3">
        <SkeletonRow w="w-1/3" />
        <SkeletonRow w="w-1/4" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <SkeletonRow w="w-2/3" />
          <SkeletonRow w="w-1/2" />
          <SkeletonRow w="w-3/4" />
        </div>
        <div className="space-y-2">
          <SkeletonRow w="w-2/3" />
          <SkeletonRow w="w-1/2" />
          <SkeletonRow w="w-3/4" />
        </div>
      </div>
      <div className="space-y-3 pt-4">
        {[1, 2, 3].map((i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600 border-slate-200",
  SENT: "bg-blue-50 text-blue-700 border-blue-200",
  VIEWED: "bg-violet-50 text-violet-700 border-violet-200",
  PAID: "bg-emerald-50 text-emerald-700 border-emerald-200",
  OVERDUE: "bg-red-50 text-red-700 border-red-200",
  VOID: "bg-slate-100 text-slate-500 border-slate-200",
};

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function PublicInvoicePage({
  params,
}: {
  params: { token: string };
}) {
  const { token } = params;
  const [invoice, setInvoice] = useState<PublicInvoiceView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInvoice() {
      try {
        const res = await fetch(`${API_BASE}/invoices/view/${token}`, {
          credentials: "include",
        });
        if (!res.ok) {
          if (res.status === 404 || res.status === 410) {
            setError("This invoice link is invalid or has expired.");
          } else {
            setError("An unexpected error occurred. Please try again later.");
          }
          return;
        }
        const json = await res.json();
        // Backend wraps in { data: ... } or returns unwrapped
        setInvoice(json.data ?? json);
      } catch {
        setError("Unable to reach the server. Please check your connection.");
      } finally {
        setLoading(false);
      }
    }

    fetchInvoice();
  }, [token]);

  const handleDownload = () => {
    if (!invoice) return;
    window.open(`${API_BASE}/invoices/${invoice.id}/pdf`, "_blank");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/20 px-4 py-10">
      <div className="mx-auto max-w-[800px]">

        {/* ── Logo ─────────────────────────────────────────────────────── */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <Zap className="h-5 w-5 text-indigo-500" />
            <span className="text-sm font-bold tracking-tight text-slate-700 dark:text-slate-300">
              InvoiceAI
            </span>
          </div>
        </div>

        {/* ── Card ─────────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 overflow-hidden">

          {/* Content */}
          <div className="p-8 md:p-10">
            {loading ? (
              <LoadingSkeleton />
            ) : error ? (
              /* ── Error State ──────────────────────────────────────── */
              <div className="flex flex-col items-center py-16 text-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20">
                  <AlertTriangle className="h-7 w-7 text-red-500" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                    Link Unavailable
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-xs">
                    {error}
                  </p>
                </div>
              </div>
            ) : invoice ? (
              <>
                {/* ── Viewed Banner ────────────────────────────────── */}
                {invoice.viewedAt && (
                  <div className="mb-6 flex items-center gap-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-4 py-3">
                    <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <p className="text-sm text-emerald-800 dark:text-emerald-300">
                      This invoice was viewed on{" "}
                      <span className="font-semibold">
                        {fmtDate(invoice.viewedAt)}
                      </span>
                    </p>
                  </div>
                )}

                {/* ── Invoice Header ───────────────────────────────── */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                      Invoice {invoice.invoiceNumber}
                    </h1>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
                          STATUS_STYLES[invoice.status] ??
                            "bg-slate-100 text-slate-600 border-slate-200"
                        )}
                      >
                        {invoice.status}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleDownload}
                    className={cn(
                      "flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5",
                      "text-sm font-semibold text-white",
                      "hover:bg-indigo-500 active:scale-95 transition-all duration-150",
                      "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    )}
                  >
                    <Download className="h-4 w-4" />
                    Download PDF
                  </button>
                </div>

                {/* ── From / To ────────────────────────────────────── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                  <div>
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                      From
                    </p>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">
                      {invoice.snapshotData.businessName}
                    </p>
                    {invoice.snapshotData.businessAddress && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 whitespace-pre-line mt-0.5">
                        {invoice.snapshotData.businessAddress}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                      To
                    </p>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">
                      {invoice.snapshotData.clientName}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                      {invoice.snapshotData.clientEmail}
                    </p>
                    {invoice.snapshotData.clientAddress && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 whitespace-pre-line mt-0.5">
                        {invoice.snapshotData.clientAddress}
                      </p>
                    )}
                  </div>
                </div>

                {/* ── Dates ────────────────────────────────────────── */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8 rounded-xl bg-slate-50 dark:bg-slate-700/40 px-5 py-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">
                      Issue Date
                    </p>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                      {fmtDate(invoice.issueDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">
                      Due Date
                    </p>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                      {fmtDate(invoice.dueDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">
                      Currency
                    </p>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                      {invoice.currency}
                    </p>
                  </div>
                </div>

                {/* ── Line Items Table ─────────────────────────────── */}
                <div className="mb-8 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                        <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                          Description
                        </th>
                        <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                          Qty
                        </th>
                        <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                          Unit Price
                        </th>
                        <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                          Tax %
                        </th>
                        <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {invoice.lineItems.map((item, idx) => (
                        <tr
                          key={item.id ?? idx}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors"
                        >
                          <td className="px-4 py-3 text-slate-800 dark:text-slate-100">
                            {item.description}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-slate-600 dark:text-slate-300">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-slate-600 dark:text-slate-300">
                            {fmt(item.unitPrice, invoice.currency)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-slate-600 dark:text-slate-300">
                            {item.taxPercent}%
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums font-medium text-slate-800 dark:text-slate-100">
                            {fmt(item.lineTotal, invoice.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* ── Totals ───────────────────────────────────────── */}
                <div className="flex justify-end mb-8">
                  <div className="w-full max-w-xs space-y-2">
                    <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
                      <span>Subtotal</span>
                      <span className="tabular-nums font-medium">
                        {fmt(invoice.subtotal, invoice.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-600 dark:text-slate-300">
                      <span>Tax</span>
                      <span className="tabular-nums font-medium">
                        {fmt(invoice.taxTotal, invoice.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between rounded-xl bg-indigo-600 px-4 py-3 text-white">
                      <span className="font-bold tracking-tight">Total</span>
                      <span className="tabular-nums font-bold text-lg">
                        {fmt(invoice.total, invoice.currency)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ── Notes & Terms ────────────────────────────────── */}
                {(invoice.notes || invoice.terms) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                    {invoice.notes && (
                      <div>
                        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                          Notes
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line">
                          {invoice.notes}
                        </p>
                      </div>
                    )}
                    {invoice.terms && (
                      <div>
                        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                          Terms
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line">
                          {invoice.terms}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-600">
          Powered by{" "}
          <span className="font-semibold text-slate-500 dark:text-slate-500">
            InvoiceAI
          </span>
        </p>
      </div>
    </div>
  );
}
