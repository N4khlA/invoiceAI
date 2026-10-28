"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, MailCheck } from "lucide-react";
import { api, extractError } from "@/lib/api";
import { forgotPasswordSchema, ForgotPasswordFormValues } from "@/lib/validations";
import { Button, Field, Input } from "@/components/ui";
import { FormError } from "@/components/auth/PasswordInput";

export default function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    setServerError(null);
    try {
      await api.post("/auth/forgot-password", values);
      setSentTo(values.email);
    } catch (err) {
      setServerError(extractError(err));
    }
  };

  if (sentTo) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <MailCheck className="size-7" aria-hidden />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Check your inbox</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          If an account exists for <span className="font-medium text-foreground">{sentTo}</span>, a reset link is on its
          way. It expires in 15 minutes.
        </p>
        <Button asChild variant="outline" className="mt-8">
          <Link href="/login">
            <ArrowLeft aria-hidden />
            Back to sign in
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <Link
        href="/login"
        className="mb-6 inline-flex items-center gap-1.5 rounded text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to sign in
      </Link>
      <h1 className="text-[28px] font-bold text-foreground">Reset your password</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">Enter your account email and we&apos;ll send you a reset link.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4" noValidate>
        <FormError message={serverError} />
        <Field label="Email" error={errors.email?.message}>
          <Input type="email" autoComplete="email" placeholder="you@studio.com" {...register("email")} />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          Send reset link
        </Button>
      </form>
    </>
  );
}
