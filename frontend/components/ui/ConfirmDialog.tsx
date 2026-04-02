"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/formatters";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Focus cancel button on open for keyboard a11y
  useEffect(() => {
    if (open) {
      setTimeout(() => cancelRef.current?.focus(), 50);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="dialog-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Panel */}
      <div className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start gap-4">
          {destructive && (
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
          )}
          <div className="flex-1">
            <h2
              id="dialog-title"
              className="text-base font-semibold text-foreground"
            >
              {title}
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {description}
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            ref={cancelRef}
            onClick={onCancel}
            disabled={isLoading}
            className={cn(
              "rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground",
              "hover:bg-accent transition-colors",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              destructive
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : "bg-primary text-primary-foreground hover:bg-indigo-500"
            )}
          >
            {isLoading ? "Please wait…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
