"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api, extractError } from "@/lib/api";
import { registerSchema, RegisterFormValues } from "@/lib/validations";
import { useAuthStore } from "@/store/authStore";
import { AuthResponse } from "@/types";
import { Button, Field, Input } from "@/components/ui";
import { FormError, PasswordChecklist, PasswordInput } from "@/components/auth/PasswordInput";

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema), defaultValues: { password: "" } });

  const onSubmit = async (values: RegisterFormValues) => {
    setServerError(null);
    try {
      const { data } = await api.post<AuthResponse>("/auth/register", values);
      setAuth(data.user, data.accessToken);
      router.push("/dashboard");
    } catch (err) {
      setServerError(extractError(err));
    }
  };

  return (
    <>
      <h1 className="text-[28px] font-bold text-foreground">Create your account</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Free forever for 5 invoices a month. No card required.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4" noValidate>
        <FormError message={serverError} />

        <Field label="Business name" error={errors.businessName?.message} hint="Shown on every invoice you send.">
          <Input autoComplete="organization" placeholder="Studio North" {...register("businessName")} />
        </Field>

        <Field label="Email" error={errors.email?.message}>
          <Input type="email" autoComplete="email" placeholder="you@studio.com" {...register("email")} />
        </Field>

        <div className="space-y-1.5">
          <Field label="Password" error={errors.password?.message}>
            <PasswordInput autoComplete="new-password" {...register("password")} />
          </Field>
          <PasswordChecklist value={watch("password") ?? ""} />
        </div>

        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
