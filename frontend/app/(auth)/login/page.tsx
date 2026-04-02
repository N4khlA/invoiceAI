"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Zap } from "lucide-react";
import { api, extractError } from "@/lib/api";
import { loginSchema, LoginFormValues } from "@/lib/validations";
import { useAuthStore } from "@/store/authStore";
import { AuthResponse } from "@/types";
import { cn } from "@/lib/formatters";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [showPw, setShowPw] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);
    try {
      const { data } = await api.post<AuthResponse>("/auth/login", values);
      setAuth(data.user, data.accessToken);
      router.push("/dashboard");
    } catch (err) {
      setServerError(extractError(err));
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* LEFT — branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gradient-to-br from-indigo-600 via-indigo-700 to-navy-900 p-12">
        <div className="flex items-center gap-2">
          <Zap className="h-7 w-7 text-white" />
          <span className="text-xl font-bold text-white">InvoiceAI</span>
        </div>
        <div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Get paid faster<br />with AI-powered<br />follow-ups
          </h2>
          <p className="text-indigo-200 text-lg max-w-sm">
            Freelancers using InvoiceAI collect payment 3x faster on average.
          </p>
        </div>
        <div className="flex gap-8">
          {[
            { label: "Active users", value: "12k+" },
            { label: "Avg collection time", value: "4 days" },
            { label: "Invoices sent", value: "500k+" },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-indigo-300 text-sm">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT — form */}
      <div className="flex flex-1 items-center justify-center p-6 bg-background">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <Zap className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold text-foreground">InvoiceAI</span>
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-1">
            Welcome back
          </h1>
          <p className="text-sm text-muted-foreground mb-8">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="text-primary hover:underline font-medium"
            >
              Sign up free
            </Link>
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
                  "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary",
                  "transition-colors",
                  errors.email ? "border-destructive" : "border-border"
                )}
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground" htmlFor="password">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPw ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={cn(
                    "w-full rounded-lg border bg-card px-3 py-2.5 pr-10 text-sm text-foreground",
                    "placeholder:text-muted-foreground",
                    "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary",
                    "transition-colors",
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
              {isSubmitting ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
