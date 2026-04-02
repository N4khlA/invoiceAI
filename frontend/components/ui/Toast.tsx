"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle, X } from "lucide-react";
import { cn } from "@/lib/formatters";

export type ToastVariant = "success" | "error";

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

// ─── ToastContainer — mount once in layout ──────────────────────────────────

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handler = (msg: ToastMessage) => {
      setToasts((prev) => [...prev, msg]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== msg.id));
      }, 4000);
    };
    listeners.push(handler);
    return () => {
      const idx = listeners.indexOf(handler);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg pointer-events-auto",
            "animate-in slide-in-from-bottom-4 fade-in duration-200",
            t.variant === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-red-500/30 bg-red-500/10 text-red-400"
          )}
        >
          {t.variant === "success" ? (
            <CheckCircle className="h-4 w-4 shrink-0" />
          ) : (
            <XCircle className="h-4 w-4 shrink-0" />
          )}
          <span className="text-sm font-medium">{t.message}</span>
          <button
            onClick={() =>
              setToasts((prev) => prev.filter((x) => x.id !== t.id))
            }
            className="ml-auto opacity-60 hover:opacity-100 transition-opacity"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
