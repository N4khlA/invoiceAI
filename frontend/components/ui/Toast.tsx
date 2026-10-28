"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Info, XCircle, X } from "lucide-react";
import { cn } from "@/lib/formatters";

export type ToastVariant = "success" | "error" | "info";

interface ToastMessage {
  id: number;
  message: string;
  variant: ToastVariant;
}

// ─── Simple in-module event bus ─────────────────────────────────────────────
type Listener = (msg: ToastMessage) => void;
const listeners: Listener[] = [];
let counter = 0;

export function toast(message: string, variant: ToastVariant = "success") {
  const msg: ToastMessage = { id: ++counter, message, variant };
  listeners.forEach((l) => l(msg));
}

const ICONS = { success: CheckCircle2, error: XCircle, info: Info };
const TONES = {
  success: "text-success",
  error: "text-destructive",
  info: "text-primary",
};

// ─── ToastContainer — mounted once in <Providers> ───────────────────────────

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handler = (msg: ToastMessage) => {
      setToasts((prev) => [...prev.slice(-2), msg]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== msg.id));
      }, msg.variant === "error" ? 6000 : 4000);
    };
    listeners.push(handler);
    return () => {
      const idx = listeners.indexOf(handler);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }, []);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-5 sm:items-end"
    >
      {toasts.map((t) => {
        const Icon = ICONS[t.variant];
        return (
          <div
            key={t.id}
            role={t.variant === "error" ? "alert" : "status"}
            className="pointer-events-auto flex w-full max-w-sm animate-slide-up items-start gap-3 rounded-xl border border-border bg-popover px-4 py-3 text-popover-foreground shadow-pop"
          >
            <Icon className={cn("mt-0.5 size-4 shrink-0", TONES[t.variant])} aria-hidden />
            <span className="flex-1 text-sm font-medium">{t.message}</span>
            <button
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              className="-m-1 cursor-pointer rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Dismiss notification"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </div>
        );
      })}
    </div>
  );
}
