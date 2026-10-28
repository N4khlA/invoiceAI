"use client";

import { forwardRef, useState } from "react";
import { Check, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui";
import { PASSWORD_CHECKS } from "@/lib/validations";
import { cn } from "@/lib/formatters";

export const PasswordInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    const [show, setShow] = useState(false);
    return (
      <div className="relative">
        <Input ref={ref} type={show ? "text" : "password"} className={cn("pr-11", className)} {...props} />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute inset-y-0 right-0 flex w-11 cursor-pointer items-center justify-center rounded-r-lg text-muted-foreground transition-colors hover:text-foreground"
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
        >
          {show ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
        </button>
      </div>
    );
  }
);
PasswordInput.displayName = "PasswordInput";

export function PasswordChecklist({ value }: { value: string }) {
  return (
    <ul className="grid grid-cols-1 gap-1 pt-1 sm:grid-cols-3" aria-label="Password requirements">
      {PASSWORD_CHECKS.map(({ label, test }) => {
        const ok = test(value);
        return (
          <li key={label} className={cn("flex items-center gap-1.5 text-xs transition-colors", ok ? "text-success" : "text-muted-foreground")}>
            <Check className={cn("size-3.5", ok ? "opacity-100" : "opacity-30")} aria-hidden />
            {label}
            <span className="sr-only">{ok ? "(met)" : "(not met)"}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
      {message}
    </div>
  );
}
