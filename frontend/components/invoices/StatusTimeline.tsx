import { Check, Circle } from "lucide-react";
import type { Invoice } from "@/types";
import { cn, formatDateTime } from "@/lib/formatters";

interface Step {
  label: string;
  date?: string | null;
  done: boolean;
  tone?: "danger" | "muted";
}

function buildSteps(invoice: Invoice): Step[] {
  const s = invoice.status;
  const sent = s !== "DRAFT" && (s !== "VOID" || Boolean(invoice.sentAt));
  const steps: Step[] = [
    { label: "Created", date: invoice.createdAt, done: true },
    { label: "Sent to client", date: invoice.sentAt, done: sent },
    { label: "Opened by client", date: invoice.viewedAt, done: Boolean(invoice.viewedAt) },
  ];
  if (s === "OVERDUE") steps.push({ label: "Past due date", date: invoice.dueDate, done: true, tone: "danger" });
  if (s === "VOID") steps.push({ label: "Voided", date: invoice.voidedAt ?? invoice.updatedAt, done: true, tone: "muted" });
  else steps.push({ label: "Paid", date: invoice.paidAt, done: s === "PAID" });
  return steps;
}

export function StatusTimeline({ invoice }: { invoice: Invoice }) {
  const steps = buildSteps(invoice);
  return (
    <ol className="relative space-y-5">
      {steps.map((step, i) => (
        <li key={step.label} className="relative flex gap-3">
          {i < steps.length - 1 && (
            <span
              className={cn("absolute left-[11px] top-7 h-[calc(100%-4px)] w-px", step.done && steps[i + 1].done ? "bg-primary/40" : "bg-border")}
              aria-hidden
            />
          )}
          <span
            className={cn(
              "relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border",
              !step.done && "border-border bg-card text-muted-foreground",
              step.done && !step.tone && "border-primary bg-primary text-primary-foreground",
              step.done && step.tone === "danger" && "border-destructive bg-destructive text-destructive-foreground",
              step.done && step.tone === "muted" && "border-muted-foreground bg-muted-foreground text-background"
            )}
            aria-hidden
          >
            {step.done ? <Check className="size-3.5" strokeWidth={3} /> : <Circle className="size-2 fill-current" />}
          </span>
          <div className="min-w-0 pt-0.5">
            <p className={cn("text-sm font-medium", step.done ? "text-foreground" : "text-muted-foreground")}>
              {step.label}
              <span className="sr-only">{step.done ? " (done)" : " (pending)"}</span>
            </p>
            {step.done && step.date && <p className="text-xs text-muted-foreground">{formatDateTime(step.date)}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
