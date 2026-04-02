"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Zap, Check } from "lucide-react";
import { api, extractError } from "@/lib/api";
import { registerSchema, RegisterFormValues } from "@/lib/validations";
import { useAuthStore } from "@/store/authStore";
import { AuthResponse } from "@/types";
import { cn } from "@/lib/formatters";

const PERKS = [
  "3 invoices/month free forever",
  "AI follow-up emails",
  "PDF generation",
  "Payment tracking",
];

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [showPw, setShowPw] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (values: RegisterFormValues) => {
    setServerError(null);
    try {
      const { data } = await api.post<AuthResponse>("/auth/register", {
        email: values.email,
        password: values.password,
        businessName: values.businessName,
      });
      setAuth(data.user, data.accessToken);
      router.push("/dashboard");
    } catch (err) {
      setServerError(extractError(err));
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* LEFT */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 p-12">
        <div className="flex items-center gap-2">
          <Zap className="h-7 w-7 text-white" />
          <span className="text-xl font-bold text-white">InvoiceAI</span>
        </div>
        <div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-6">
            Start invoicing<br />smarter today
          </h2>
          <ul className="space-y-3">
            {PERKS.map((perk) => (
              <li key={perk} className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                  <Check className="h-3.5 w-3.5 text-white" />
                </span>
                <span className="text-indigo-100">{perk}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-indigo-300 text-sm">
          No credit card required · Cancel anytime
        </p>
      </div>

      {/* RIGHT */}
      <div className="flex flex-1 items-center justify-center p-6 bg-background">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <Zap className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold text-foreground">InvoiceAI</span>
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-1">
            Create your account
          </h1>
          <p className="text-sm text-muted-foreground mb-8">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {serverError && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
                {serverError}
              </div>
            )}

            {[
              {
                id: "businessName",
                label: "Business / Freelancer name",
                type: "text",
                placeholder: "Acme Studio",
                autoComplete: "organization",
                error: errors.businessName,
                field: register("businessName"),
              },
              {
                id: "email",
                label: "Email",
                type: "email",
                placeholder: "you@example.com",
                autoComplete: "email",
                error: errors.email,
                field: register("email"),
              },
            ].map(({ id, label, type, placeholder, autoComplete, error, field }) => (
              <div key={id} className="space-y-1">
                <label className="text-sm font-medium text-foreground" htmlFor={id}>
                  {label}
                </label>
                <input
                  id={id}
                  type={type}
                  autoComplete={autoComplete}
                  placeholder={placeholder}
                  className={cn(
                    "w-full rounded-lg border bg-card px-3 py-2.5 text-sm text-foreground",
                    "placeholder:text-muted-foreground",
                    "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors",
                    error ? "border-destructive" : "border-border"
                  )}
                  {...field}
                />
                {error && (
                  <p className="text-xs text-destructive">{error.message}</p>
                )}
              </div>
            ))}

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPw ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Min. 8 chars, 1 uppercase, 1 number"
                  className={cn(
                    "w-full rounded-lg border bg-card px-3 py-2.5 pr-10 text-sm text-foreground",
                    "placeholder:text-muted-foreground",
                    "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors",
                    errors.password ? "border-destructive" : "border-border"
                  )}
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground" htmlFor="confirmPassword">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                className={cn(
                  "w-full rounded-lg border bg-card px-3 py-2.5 text-sm text-foreground",
                  "placeholder:text-muted-foreground",
                  "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors",
                  errors.confirmPassword ? "border-destructive" : "border-border"
                )}
                {...register("confirmPassword")}
              />
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                "w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground",
                "transition-all hover:bg-indigo-500 active:scale-[0.98]",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2"
              )}
            >
              {isSubmitting ? "Creating account…" : "Create free account"}
            </button>

            <p className="text-center text-xs text-muted-foreground">
              By signing up you agree to our{" "}
              <Link href="/terms" className="text-primary hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
