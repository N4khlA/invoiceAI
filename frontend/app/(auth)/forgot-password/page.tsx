"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Zap, MailCheck } from "lucide-react";
import { api, extractError } from "@/lib/api";
import { forgotPasswordSchema, ForgotPasswordFormValues } from "@/lib/validations";
import { cn } from "@/lib/formatters";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    setServerError(null);
    try {
      await api.post("/auth/forgot-password", values);
      setSent(true);
    } catch (err) {
      setServerError(extractError(err));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-10">
          <Zap className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold text-foreground">InvoiceAI</span>
        </div>

        {sent ? (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <MailCheck className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-xl font-bold text-foreground mb-2">
              Check your inbox
            </h1>
            <p className="text-sm text-muted-foreground mb-6">
              We&apos;ve sent a password reset link to{" "}
              <span className="font-medium text-foreground">{getValues("email")}</span>.
              It expires in 30 minutes.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>

            <h1 className="text-2xl font-bold text-foreground mb-1">
              Forgot your password?
            </h1>
            <p className="text-sm text-muted-foreground mb-8">
              Enter your email and we&apos;ll send you a reset link.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {serverError && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
                  {serverError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className={cn(
                    "w-full rounded-lg border bg-card px-3 py-2.5 text-sm text-foreground",
                    "placeholder:text-muted-foreground",
                    "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors",
                    errors.email ? "border-destructive" : "border-border"
                  )}
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={cn(
                  "w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground",
                  "transition-all hover:bg-indigo-500 active:scale-[0.98]",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {isSubmitting ? "Sending…" : "Send reset link"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
