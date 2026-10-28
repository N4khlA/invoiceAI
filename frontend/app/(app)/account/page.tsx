"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ImageOff } from "lucide-react";
import { useTheme } from "next-themes";
import { accountApi, useAccount } from "@/hooks/useAccount";
import { useAuthStore } from "@/store/authStore";
import { extractError } from "@/lib/api";
import { businessSchema, BusinessFormValues, changePasswordSchema, ChangePasswordFormValues } from "@/lib/validations";
import { CURRENCIES, cn } from "@/lib/formatters";
import type { AiTone, AuthUser, Currency } from "@/types";
import { Button, Card, CardHeader, ErrorState, Field, Input, Page, PageHeader, Select, Skeleton, Textarea, ThemeToggle, toast } from "@/components/ui";
import { FormError, PasswordChecklist, PasswordInput } from "@/components/auth/PasswordInput";

const TONES: { value: AiTone; label: string; example: string }[] = [
  { value: "FRIENDLY", label: "Friendly", example: "“Hope you're well! Just a quick nudge…”" },
  { value: "PROFESSIONAL", label: "Professional", example: "“This is a reminder that invoice INV-0012…”" },
  { value: "FORMAL", label: "Formal", example: "“We would like to remind you that…”" },
];

function BusinessSection({ account, onSaved }: { account: AuthUser; onSaved: (u: AuthUser) => void }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<BusinessFormValues>({
    resolver: zodResolver(businessSchema),
    defaultValues: {
      bizName: account.bizName ?? "",
      name: account.name ?? "",
      bizAddress: account.bizAddress ?? "",
      bizPhone: account.bizPhone ?? "",
      bizWebsite: account.bizWebsite ?? "",
      logoUrl: account.logoUrl ?? "",
      currency: account.currency ?? "USD",
    },
  });
  const logoUrl = watch("logoUrl");
  const [logoBroken, setLogoBroken] = useState(false);
  useEffect(() => setLogoBroken(false), [logoUrl]);

  const onSubmit = async (v: BusinessFormValues) => {
    setServerError(null);
    try {
      const updated = await accountApi.update({
        bizName: v.bizName,
        name: v.name ?? "",
        bizAddress: v.bizAddress ?? "",
        bizPhone: v.bizPhone ?? "",
        bizWebsite: v.bizWebsite ?? "",
        logoUrl: v.logoUrl ?? "",
        currency: v.currency as Currency,
      });
      onSaved(updated);
      reset(v);
      toast("Business details saved");
    } catch (err) {
      setServerError(extractError(err));
    }
  };

  return (
    <Card>
      <CardHeader title="Business profile" description="Shown on every new invoice. Sent invoices keep the details they were sent with." />
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 p-5">
        <FormError message={serverError} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Business name" error={errors.bizName?.message}>
            <Input autoComplete="organization" {...register("bizName")} />
          </Field>
          <Field label="Your name" optional error={errors.name?.message}>
            <Input autoComplete="name" {...register("name")} />
          </Field>
          <Field label="Address" optional error={errors.bizAddress?.message} className="sm:col-span-2">
            <Textarea rows={2} {...register("bizAddress")} />
          </Field>
          <Field label="Phone" optional error={errors.bizPhone?.message}>
            <Input type="tel" autoComplete="tel" {...register("bizPhone")} />
          </Field>
          <Field label="Website" optional error={errors.bizWebsite?.message}>
            <Input type="url" placeholder="https://" {...register("bizWebsite")} />
          </Field>
          <Field label="Default currency" hint="Used for new invoices and your dashboard.">
            <Select {...register("currency")}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <div className="flex items-end gap-3">
            <Field label="Logo URL" optional error={errors.logoUrl?.message} hint="Link to a PNG or SVG." className="flex-1">
              <Input type="url" placeholder="https://…/logo.png" {...register("logoUrl")} />
            </Field>
            <div
              className={cn("mb-[22px] flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-white", errors.logoUrl && "mb-[22px]")}
              aria-hidden
            >
              {logoUrl && !logoBroken ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="" className="size-full object-contain p-1" onError={() => setLogoBroken(true)} />
              ) : (
                <ImageOff className="size-4 text-slate-400" />
              )}
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
            Save changes
          </Button>
        </div>
      </form>
    </Card>
  );
}

function PreferencesSection({ account, onSaved }: { account: AuthUser; onSaved: (u: AuthUser) => void }) {
  const [saving, setSaving] = useState<string | null>(null);
  const { resolvedTheme } = useTheme();

  const save = async (key: string, payload: { aiTone?: AiTone; readReceipts?: boolean }) => {
    setSaving(key);
    try {
      onSaved(await accountApi.update(payload));
      toast("Preference saved");
    } catch (err) {
      toast(extractError(err), "error");
    } finally {
      setSaving(null);
    }
  };

  return (
    <Card>
      <CardHeader title="Preferences" />
      <div className="divide-y divide-border">
        <div className="p-5">
          <p className="text-sm font-medium text-foreground">Reminder tone</p>
          <p className="mb-3 text-sm text-muted-foreground">The default voice for AI-written payment reminders.</p>
          <div role="radiogroup" aria-label="Reminder tone" className="grid gap-2 sm:grid-cols-3">
            {TONES.map((t) => {
              const active = account.aiTone === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={saving === "tone"}
                  onClick={() => !active && save("tone", { aiTone: t.value })}
                  className={cn(
                    "cursor-pointer rounded-lg border p-3 text-left transition-colors disabled:cursor-wait",
                    active ? "border-primary bg-accent" : "border-border hover:border-muted-foreground/40"
                  )}
                >
                  <span className={cn("block text-sm font-semibold", active ? "text-accent-foreground" : "text-foreground")}>{t.label}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{t.example}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 p-5">
          <div>
            <p id="rr-label" className="text-sm font-medium text-foreground">Read receipts</p>
            <p className="text-sm text-muted-foreground">Mark invoices as “Viewed” when your client opens the link.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={account.readReceipts}
            aria-labelledby="rr-label"
            disabled={saving === "rr"}
            onClick={() => save("rr", { readReceipts: !account.readReceipts })}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:cursor-wait disabled:opacity-60",
              account.readReceipts ? "bg-primary" : "bg-muted-foreground/30"
            )}
          >
            <span className={cn("inline-block size-5 rounded-full bg-white shadow transition-transform", account.readReceipts ? "translate-x-[22px]" : "translate-x-0.5")} />
          </button>
        </div>

        <div className="flex items-center justify-between gap-4 p-5">
          <div>
            <p className="text-sm font-medium text-foreground">Appearance</p>
            <p className="text-sm text-muted-foreground">Currently {resolvedTheme === "dark" ? "dark" : "light"}. System follows your device.</p>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </Card>
  );
}

function PasswordSection() {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({ resolver: zodResolver(changePasswordSchema), defaultValues: { newPassword: "" } });

  const onSubmit = async (v: ChangePasswordFormValues) => {
    setServerError(null);
    try {
      await accountApi.changePassword({ currentPassword: v.currentPassword, newPassword: v.newPassword });
      reset({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast("Password changed");
    } catch (err) {
      setServerError(extractError(err));
    }
  };

  return (
    <Card>
      <CardHeader title="Password" />
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 p-5">
        <FormError message={serverError} />
        <Field label="Current password" error={errors.currentPassword?.message} className="sm:max-w-sm">
          <PasswordInput autoComplete="current-password" {...register("currentPassword")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Field label="New password" error={errors.newPassword?.message}>
              <PasswordInput autoComplete="new-password" {...register("newPassword")} />
            </Field>
            <PasswordChecklist value={watch("newPassword") ?? ""} />
          </div>
          <Field label="Confirm new password" error={errors.confirmPassword?.message}>
            <PasswordInput autoComplete="new-password" {...register("confirmPassword")} />
          </Field>
        </div>
        <div className="flex justify-end">
          <Button type="submit" variant="outline" loading={isSubmitting}>
            Update password
          </Button>
        </div>
      </form>
    </Card>
  );
}

export default function AccountPage() {
  const { account, isLoading, error, refetch } = useAccount();
  const updateUser = useAuthStore((s) => s.updateUser);
  const [current, setCurrent] = useState<AuthUser | null>(null);
  useEffect(() => setCurrent(account), [account]);

  const onSaved = (u: AuthUser) => {
    setCurrent(u);
    updateUser(u);
  };

  return (
    <Page className="max-w-4xl">
      <PageHeader title="Settings" description={current?.email} />
      {error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : isLoading || !current ? (
        <div className="space-y-6">
          <Skeleton className="h-[420px] rounded-xl" />
          <Skeleton className="h-[260px] rounded-xl" />
        </div>
      ) : (
        <div className="space-y-6">
          <BusinessSection account={current} onSaved={onSaved} />
          <PreferencesSection account={current} onSaved={onSaved} />
          <PasswordSection />
        </div>
      )}
    </Page>
  );
}
