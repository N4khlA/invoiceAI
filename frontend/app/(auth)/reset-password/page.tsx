"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound } from "lucide-react";
import { api, extractError } from "@/lib/api";
import { resetPasswordSchema, ResetPasswordFormValues } from "@/lib/validations";
import { Button, Field } from "@/components/ui";
import { toast } from "@/components/ui/Toast";
import { FormError, PasswordChecklist, PasswordInput } from "@/components/auth/PasswordInput";

function ResetForm() {
  const router = useRouter();
  const token = useSearchParams().get("token");
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({ resolver: zodResolver(resetPasswordSchema), defaultValues: { newPassword: "" } });

  if (!token) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">This link is incomplete</h1>
        <p className="mt-2 text-sm text-muted-foreground">Open the reset link from your email again, or request a new one.</p>
        <Button asChild className="mt-8">
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
      </div>
    );
  }

  const onSubmit = async (values: ResetPasswordFormValues) => {
    setServerError(null);
    try {
      await api.post("/auth/reset-password", { token, newPassword: values.newPassword });
      toast("Password updated — sign in with your new password.");
      router.push("/login");
    } catch (err) {
      setServerError(extractError(err));
    }
  };

  return (
    <>
      <div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <KeyRound className="size-6" aria-hidden />
      </div>
      <h1 className="text-[28px] font-bold text-foreground">Choose a new password</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">You&apos;ll be signed out of other devices.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4" noValidate>
        <FormError message={serverError} />
        <div className="space-y-1.5">
          <Field label="New password" error={errors.newPassword?.message}>
            <PasswordInput autoComplete="new-password" {...register("newPassword")} />
          </Field>
          <PasswordChecklist value={watch("newPassword") ?? ""} />
        </div>
        <Field label="Confirm password" error={errors.confirmPassword?.message}>
          <PasswordInput autoComplete="new-password" {...register("confirmPassword")} />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          Update password
        </Button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
