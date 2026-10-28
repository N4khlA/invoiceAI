"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Sparkles } from "lucide-react";
import { api, extractError, DEMO_CREDENTIALS } from "@/lib/api";
import { loginSchema, LoginFormValues } from "@/lib/validations";
import { useAuthStore } from "@/store/authStore";
import { AuthResponse } from "@/types";
import { Button, Field, Input } from "@/components/ui";
import { FormError, PasswordInput } from "@/components/auth/PasswordInput";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [serverError, setServerError] = useState<string | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);

  const next = params.get("next");
  const destination = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const signIn = async (values: LoginFormValues) => {
    setServerError(null);
    try {
      const { data } = await api.post<AuthResponse>("/auth/login", values);
      setAuth(data.user, data.accessToken);
      router.push(destination);
    } catch (err) {
      setServerError(extractError(err));
    }
  };

  const tryDemo = async () => {
    setDemoLoading(true);
    await signIn(DEMO_CREDENTIALS);
    setDemoLoading(false);
  };

  // /login?demo=1 (from the landing page) signs straight into the demo
  const autoDemo = useRef(false);
  useEffect(() => {
    if (params.get("demo") === "1" && !autoDemo.current) {
      autoDemo.current = true;
      void tryDemo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <h1 className="text-[28px] font-bold text-foreground">Welcome back</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        New to InvoiceAI?{" "}
        <Link href="/register" className="font-semibold text-primary hover:underline">
          Create a free account
        </Link>
      </p>

      <Button variant="outline" size="lg" className="mt-8 w-full" onClick={tryDemo} loading={demoLoading} disabled={isSubmitting}>
        {!demoLoading && <Sparkles className="text-primary" aria-hidden />}
        Explore the demo account
      </Button>

      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground" aria-hidden>
        <span className="h-px flex-1 bg-border" />
        or sign in with email
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSubmit(signIn)} className="space-y-4" noValidate>
        <FormError message={serverError} />

        <Field label="Email" error={errors.email?.message}>
          <Input type="email" autoComplete="email" placeholder="you@studio.com" {...register("email")} />
        </Field>

        <div className="space-y-1.5">
          <Field label="Password" error={errors.password?.message}>
            <PasswordInput autoComplete="current-password" {...register("password")} />
          </Field>
          <div className="text-right">
            <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
        </div>

        <Button type="submit" size="lg" className="w-full" loading={isSubmitting} disabled={demoLoading}>
          Sign in
        </Button>
      </form>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
