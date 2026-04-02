"use client";

import { useState } from "react";
import Link from "next/link";
import { useInvoices } from "@/hooks/useInvoices";
import { InvoiceStatus } from "@/types";
import { formatCurrency } from "@/lib/formatters";
import { Plus, Search, FileText, ChevronRight } from "lucide-react";
import { cn } from "@/lib/formatters";

const ALL_STATUSES: Array<InvoiceStatus | "ALL"> = [
  "ALL",
  "DRAFT",
  "SENT",
  "VIEWED",
  "OVERDUE",
  "PAID",
  "VOID",
];

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  SENT: "bg-blue-500/15 text-blue-400",
  VIEWED: "bg-purple-500/15 text-purple-400",
  OVERDUE: "bg-red-500/15 text-red-400",
  PAID: "bg-emerald-500/15 text-emerald-400",
  VOID: "bg-zinc-500/15 text-zinc-400",
};

export default function InvoicesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | undefined>();
  const [page, setPage] = useState(1);

  const { invoices, total, totalPages, isLoading, error } = useInvoices({
    search: search || undefined,
    status: statusFilter,
    page,
    limit: 15,
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Invoices</h1>
          <p className="text-sm text-muted-foreground">
            {total} total invoices
          </p>
        </div>
        <Link
          href="/invoices/new"
          className={cn(
            "flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5",
            "text-sm font-semibold text-primary-foreground",
            "hover:bg-indigo-500 transition-colors"
          )}
        >
          <Plus className="h-4 w-4" />
          New Invoice
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by client or invoice #…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className={cn(
              "w-full rounded-lg border border-border bg-card pl-9 pr-3 py-2 text-sm",
              "text-foreground placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            )}
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {ALL_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => {
                setStatusFilter(s === "ALL" ? undefined : (s as InvoiceStatus));
                setPage(1);
              }}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                (s === "ALL" && !statusFilter) || s === statusFilter
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-border">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="px-5 py-4 h-14 animate-pulse bg-muted/10" />
            ))}
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <FileText className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">No invoices found</p>
            <p className="text-sm text-muted-foreground mb-4">
              {search || statusFilter
                ? "Try adjusting your filters."
                : "Create your first invoice to get started."}
            </p>
            {!search && !statusFilter && (
              <Link href="/invoices/new" className="text-sm text-primary hover:underline">
                Create invoice →
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Column headers */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_40px] gap-4 px-5 py-2.5 border-b border-border">
              {["Client", "Invoice #", "Due Date", "Amount", ""].map((h) => (
                <span key={h} className="text-xs font-medium text-muted-foreground">
                  {h}
                </span>
              ))}
            </div>
            <ul className="divide-y divide-border">
              {invoices.map((inv) => (
                <li key={inv.id}>
                  <Link
                    href={`/invoices/${inv.id}`}
                    className="grid grid-cols-[2fr_1fr_1fr_1fr_40px] gap-4 items-center px-5 py-3.5 hover:bg-accent transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {inv.client?.name ?? "—"}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground font-mono text-xs">
                      {inv.invoiceNumber}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(inv.dueDate).toLocaleDateString()}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
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
                    <ChevronRight className="h-4 w-4 text-muted-foreground justify-self-end" />
                  </Link>
                </li>
              ))}
            </ul>

            {/* Pagination */}
            {(totalPages ?? 1) > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="text-xs text-primary hover:underline disabled:opacity-40 disabled:no-underline"
                  >
                    Previous
                  </button>
                  <button
                    disabled={page >= (totalPages ?? 1)}
                    onClick={() => setPage((p) => p + 1)}
                    className="text-xs text-primary hover:underline disabled:opacity-40 disabled:no-underline"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
