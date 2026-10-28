"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/formatters";

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

/** Accessible dialog (focus trap, Esc, scroll lock) on Radix. */
export function Modal({ open, onOpenChange, title, description, children, footer, className }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 animate-fade-in bg-slate-950/50 backdrop-blur-[2px]" />
        <Dialog.Content
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] w-full animate-slide-up overflow-y-auto rounded-t-2xl border border-border bg-card shadow-pop focus:outline-none",
            "sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:animate-scale-in sm:rounded-2xl",
            className
          )}
        >
          <div className="flex items-start justify-between gap-4 px-6 pt-6">
            <div>
              <Dialog.Title className="font-display text-lg font-semibold text-foreground">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1 text-sm text-muted-foreground">{description}</Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{typeof title === "string" ? title : "Dialog"}</Dialog.Description>
              )}
            </div>
            <Dialog.Close
              className="-mr-2 -mt-1 flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Close"
            >
              <X className="size-4" aria-hidden />
            </Dialog.Close>
          </div>
          {children && <div className="px-6 pt-5">{children}</div>}
          {footer && (
            <div className="flex flex-col-reverse gap-2 px-6 pb-6 pt-6 sm:flex-row sm:justify-end">{footer}</div>
          )}
          {!footer && <div className="pb-6" />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
