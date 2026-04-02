"use client";

import { Invoice } from "@/types";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { cn } from "@/lib/formatters";

interface Step {
  label: string;
  date?: string;
  completed: boolean;
  active: boolean;
}

function buildSteps(invoice: Invoice): Step[] {
  const fmt = (d?: string) =>
    d ? new Date(d).toLocaleDateString(undefined, { dateStyle: "medium" }) : undefined;

  const isPaidOrVoid = invoice.status === "PAID" || invoice.status === "VOID";
  const isSentOrBeyond =
    invoice.status === "SENT" ||
    invoice.status === "VIEWED" ||
    isPaidOrVoid;
  const isViewedOrBeyond =
    invoice.status === "VIEWED" || isPaidOrVoid;

  return [
    {
      label: "Created",
      date: fmt(invoice.createdAt),
      completed: true,
      active: false,
    },
    {
      label: "Sent",
      date: fmt(invoice.sentAt),
      completed: isSentOrBeyond,
      active: invoice.status === "SENT",
    },
    {
      label: "Viewed",
      date: fmt(invoice.viewedAt),
      completed: isViewedOrBeyond,
      active: invoice.status === "VIEWED",
    },
    {
      label: invoice.status === "VOID" ? "Void" : "Paid",
      date:
        invoice.status === "VOID" ? fmt(invoice.updatedAt) : fmt(invoice.paidAt),
      completed: isPaidOrVoid,
      active: isPaidOrVoid,
    },
  ];
}

export function StatusTimeline({ invoice }: { invoice: Invoice }) {
  const steps = buildSteps(invoice);

  return (
    <div className="flex items-start gap-0">
      {steps.map((step, idx) => {
        const isLast = idx === steps.length - 1;
        return (
          <div key={step.label} className="flex items-start flex-1">
            {/* Step node + connector */}
            <div className="flex flex-col items-center flex-1">
              <div className="flex items-center w-full">
                {/* Left line */}
                {idx > 0 && (
                  <div
                    className={cn(
                      "h-px flex-1 transition-colors",
                      step.completed ? "bg-primary" : "bg-border"
                    )}
                  />
                )}
                {/* Icon */}
                <div
                  className={cn(
                    "flex-shrink-0 rounded-full transition-all",
                    step.completed
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                >
                  {step.completed ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : step.active ? (
                    <Clock className="h-5 w-5 text-amber-400" />
                  ) : (
                    <Circle className="h-5 w-5" />
                  )}
                </div>
                {/* Right line */}
                {!isLast && (
                  <div
                    className={cn(
                      "h-px flex-1 transition-colors",
                      steps[idx + 1]?.completed ? "bg-primary" : "bg-border"
                    )}
                  />
                )}
              </div>

              {/* Label + date */}
              <div className="mt-1.5 text-center">
                <p
                  className={cn(
                    "text-xs font-medium",
                    step.completed ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </p>
                {step.date && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {step.date}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
