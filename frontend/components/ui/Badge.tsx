import { cn } from "@/lib/formatters";
import type { InvoiceStatus } from "@/types";

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        className
      )}
      {...props}
    />
  );
}

const STATUS: Record<InvoiceStatus, { label: string; className: string; dot: string }> = {
  DRAFT:   { label: "Draft",   className: "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300", dot: "bg-slate-400" },
  SENT:    { label: "Sent",    className: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300", dot: "bg-blue-500" },
  VIEWED:  { label: "Viewed",  className: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300", dot: "bg-violet-500" },
  PAID:    { label: "Paid",    className: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300", dot: "bg-emerald-500" },
  OVERDUE: { label: "Overdue", className: "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300", dot: "bg-red-500" },
  VOID:    { label: "Void",    className: "border-slate-200 bg-transparent text-slate-500 line-through dark:border-slate-700 dark:text-slate-400", dot: "bg-slate-400" },
};

export const STATUS_LABELS: Record<InvoiceStatus, string> = Object.fromEntries(
  Object.entries(STATUS).map(([k, v]) => [k, v.label])
) as Record<InvoiceStatus, string>;

export function StatusBadge({ status, className }: { status: InvoiceStatus; className?: string }) {
  const s = STATUS[status] ?? STATUS.DRAFT;
  return (
    <Badge className={cn(s.className, className)}>
      <span className={cn("size-1.5 rounded-full", s.dot)} aria-hidden />
      {s.label}
    </Badge>
  );
}

export function PlanBadge({ plan }: { plan: "FREE" | "PRO" }) {
  return (
    <Badge
      className={cn(
        "px-2 py-0 text-[11px] tracking-wide",
        plan === "PRO"
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-border bg-muted text-muted-foreground"
      )}
    >
      {plan}
    </Badge>
  );
}
