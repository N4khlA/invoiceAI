"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import type { Invoice } from "@/types";
import { formatCurrency, formatDate, getDaysOverdue } from "@/lib/formatters";
import { StatusBadge, Skeleton } from "@/components/ui";
import { cn } from "@/lib/formatters";

function DueLabel({ invoice }: { invoice: Invoice }) {
  if (invoice.status === "PAID") return <span>Paid {formatDate(invoice.paidAt)}</span>;
  if (invoice.status === "OVERDUE") {
    const days = getDaysOverdue(invoice.dueDate);
    return <span className="font-medium text-destructive">{days === 0 ? "Due today" : `${days}d overdue`}</span>;
  }
  return <span>Due {formatDate(invoice.dueDate)}</span>;
}

/** Table on ≥ md, stacked cards below. Rows link to the invoice. */
export function InvoiceTable({
  invoices,
  isLoading,
  hideClient,
  rows = 5,
}: {
  invoices: Invoice[];
  isLoading?: boolean;
  hideClient?: boolean;
  rows?: number;
}) {
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <table className="hidden w-full text-sm md:table">
        <thead>
          <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <th scope="col" className="px-5 py-3 font-medium">Invoice</th>
            {!hideClient && <th scope="col" className="px-5 py-3 font-medium">Client</th>}
            <th scope="col" className="px-5 py-3 font-medium">Status</th>
            <th scope="col" className="px-5 py-3 font-medium">Due</th>
            <th scope="col" className="px-5 py-3 text-right font-medium">Amount</th>
            <th scope="col" className="w-10"><span className="sr-only">Open</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {invoices.map((inv) => (
            <tr
              key={inv.id}
              onClick={() => router.push(`/invoices/${inv.id}`)}
              className="group cursor-pointer transition-colors hover:bg-muted/50"
            >
              <td className="px-5 py-3.5">
                <Link href={`/invoices/${inv.id}`} className="rounded font-mono text-[13px] font-medium text-foreground" onClick={(e) => e.stopPropagation()}>
                  {inv.number}
                </Link>
              </td>
              {!hideClient && (
                <td className="max-w-[220px] px-5 py-3.5">
                  <p className="truncate font-medium text-foreground">{inv.client?.name ?? "—"}</p>
                </td>
              )}
              <td className="px-5 py-3.5"><StatusBadge status={inv.status} /></td>
              <td className="whitespace-nowrap px-5 py-3.5 text-muted-foreground"><DueLabel invoice={inv} /></td>
              <td className={cn("tabular whitespace-nowrap px-5 py-3.5 text-right font-semibold text-foreground", inv.status === "VOID" && "text-muted-foreground line-through")}>
                {formatCurrency(inv.total, inv.currency)}
              </td>
              <td className="pr-4 text-muted-foreground">
                <ChevronRight className="size-4 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile cards */}
      <ul className="divide-y divide-border md:hidden">
        {invoices.map((inv) => (
          <li key={inv.id}>
            <Link href={`/invoices/${inv.id}`} className="flex items-center gap-3 px-4 py-3.5 transition-colors active:bg-muted">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium text-foreground">{hideClient ? inv.number : inv.client?.name ?? "—"}</p>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {!hideClient && <span className="font-mono">{inv.number} · </span>}
                  <DueLabel invoice={inv} />
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="tabular text-sm font-semibold text-foreground">{formatCurrency(inv.total, inv.currency)}</span>
                <StatusBadge status={inv.status} />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
