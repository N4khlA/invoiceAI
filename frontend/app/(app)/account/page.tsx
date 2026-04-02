"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import {
  Building2,
  Upload,
  Lock,
  SlidersHorizontal,
  Eye,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
} from "lucide-react";
import { z } from "zod";
import { useAccount, accountApi } from "@/hooks/useAccount";
import { useAuthStore } from "@/store/authStore";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/formatters";
import { AiTone, Currency } from "@/types";

// ─── Types ─────────────────────────────────────────────────────────────────────

const CURRENCIES: Currency[] = ["USD", "EUR", "GBP", "CAD", "AUD", "INR"];
const AI_TONES: { value: AiTone; label: string }[] = [
  { value: "FORMAL", label: "Formal" },
  { value: "FRIENDLY", label: "Friendly" },
  { value: "FIRM", label: "Firm" },
];

const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];

// ─── Password strength ────────────────────────────────────────────────────────

type StrengthLevel = "weak" | "medium" | "strong";

function getPasswordStrength(pwd: string): StrengthLevel {
  if (pwd.length === 0) return "weak";
  const hasMin = pwd.length >= 8;
  const hasUpper = /[A-Z]/.test(pwd);
  const hasNumber = /[0-9]/.test(pwd);
  const hasSpecial = /[^A-Za-z0-9]/.test(pwd);
  const score = [hasMin, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
  if (score <= 2) return "weak";
  if (score === 3) return "medium";
  return "strong";
}

const STRENGTH_CONFIG: Record<
  StrengthLevel,
  { label: string; color: string; bars: number }
> = {
  weak:   { label: "Weak",   color: "bg-red-500",    bars: 1 },
  medium: { label: "Medium", color: "bg-amber-400",  bars: 2 },
  strong: { label: "Strong", color: "bg-emerald-500", bars: 3 },
};

// ─── Password schema ──────────────────────────────────────────────────────────

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "At least 8 characters")
      .regex(/[A-Z]/, "Must contain an uppercase letter")
      .regex(/[0-9]/, "Must contain a number"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type PasswordErrors = Partial<
  Record<"currentPassword" | "newPassword" | "confirmPassword", string>
>;

// ─── Shared sub-components ────────────────────────────────────────────────────

function SettingsCard({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Card header */}
      <div className="flex items-center gap-3 border-b border-border px-6 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-4.5 w-4.5 text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </label>
      {children}
      {error && (
        <p className="flex items-center gap-1 text-xs text-red-400">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

function InlineError({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-400">
      <AlertCircle className="h-4 w-4 shrink-0" />
      {message}
    </div>
  );
}

function SaveButton({
  loading,
  disabled,
  label = "Save changes",
}: {
  loading: boolean;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className={cn(
        "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all",
        "bg-primary text-primary-foreground hover:bg-indigo-500",
        "disabled:opacity-50 disabled:cursor-not-allowed"
      )}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Saving…
        </>
      ) : (
        label
      )}
    </button>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function AccountSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-3 border-b border-border px-6 py-4">
            <div className="h-9 w-9 rounded-lg bg-muted" />
            <div className="space-y-1.5">
              <div className="h-3 w-28 rounded bg-muted" />
              <div className="h-2.5 w-44 rounded bg-muted" />
            </div>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div className="h-9 rounded-lg bg-muted" />
            <div className="h-9 rounded-lg bg-muted" />
            <div className="flex justify-end">
              <div className="h-9 w-28 rounded-lg bg-muted" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Card 1 — Business Details ────────────────────────────────────────────────

function BusinessDetailsCard() {
  const { account, isLoading } = useAccount();
  const updateUser = useAuthStore((s) => s.updateUser);

  const [businessName, setBusinessName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Seed form from fetched account
  useEffect(() => {
    if (account) {
      setBusinessName(account.businessName ?? "");
      setBusinessAddress(account.businessAddress ?? "");
      setCurrency(account.currency ?? "USD");
      if (account.businessLogoUrl) setLogoPreview(account.businessLogoUrl);
    }
  }, [account]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLogoError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      setLogoError("Only PNG, JPG, or WebP files are allowed");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError("File must be under 2 MB");
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const clearLogo = useCallback(() => {
    setLogoFile(null);
    setLogoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await accountApi.updateBusiness({
        businessName: businessName.trim(),
        businessAddress: businessAddress.trim(),
        currency,
        logoFile: logoFile ?? undefined,
      });
      updateUser(updated);
      setLogoFile(null);
      toast("Business details saved");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to save business details";
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return null; // skeleton rendered by parent

  return (
    <SettingsCard
      icon={Building2}
      title="Business Details"
      subtitle="Your company info shown on invoices"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {saveError && <InlineError message={saveError} />}

        <FormField label="Business Name">
          <input
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Acme Inc."
            className={cn(
              "w-full rounded-lg border border-input bg-background",
              "px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
            )}
          />
        </FormField>

        {/* Logo upload */}
        <FormField label="Business Logo" error={logoError ?? undefined}>
          <div className="flex items-center gap-4">
            {/* Preview box */}
            <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-border bg-muted overflow-hidden">
              {logoPreview ? (
                <>
                  <Image src={logoPreview} alt="Logo preview" fill className="object-contain p-1" />
                  <button
                    type="button"
                    onClick={clearLogo}
                    className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-background/80 text-foreground hover:bg-destructive hover:text-white transition"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </>
              ) : (
                <Building2 className="h-6 w-6 text-muted-foreground/40" />
              )}
            </div>
            <div className="flex-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "flex items-center gap-2 rounded-lg border border-dashed border-border",
                  "px-4 py-2.5 text-sm text-muted-foreground w-full justify-center",
                  "hover:border-primary/60 hover:text-primary transition-colors"
                )}
              >
                <Upload className="h-4 w-4" />
                {logoPreview ? "Change logo" : "Upload logo"}
              </button>
              <p className="mt-1 text-xs text-muted-foreground/60 text-center">
                PNG, JPG, WebP · max 2 MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleLogoChange}
                className="hidden"
              />
            </div>
          </div>
        </FormField>

        <FormField label="Business Address">
          <textarea
            value={businessAddress}
            onChange={(e) => setBusinessAddress(e.target.value)}
            rows={3}
            placeholder="123 Main St, City, Country"
            className={cn(
              "w-full rounded-lg border border-input bg-background",
              "px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-2 focus:ring-primary/50 transition resize-none"
            )}
          />
        </FormField>

        <FormField label="Currency">
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as Currency)}
            className={cn(
              "w-full rounded-lg border border-input bg-background",
              "px-3 py-2 text-sm text-foreground",
              "focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
            )}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </FormField>

        <div className="flex justify-end pt-1">
          <SaveButton loading={saving} />
        </div>
      </form>
    </SettingsCard>
  );
}

// ─── Card 2 — Preferences ─────────────────────────────────────────────────────

function PreferencesCard() {
  const { account, isLoading } = useAccount();
  const updateUser = useAuthStore((s) => s.updateUser);

  const [aiTone, setAiTone] = useState<AiTone>("FORMAL");
  const [readReceipts, setReadReceipts] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (account) {
      setAiTone(account.aiTone ?? "FORMAL");
      setReadReceipts(account.readReceipts ?? false);
    }
  }, [account]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await accountApi.updatePreferences({ aiTone, readReceipts });
      updateUser(updated);
      toast("Preferences saved");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save preferences";
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return null;

  return (
    <SettingsCard
      icon={SlidersHorizontal}
      title="Preferences"
      subtitle="Customize your AI and tracking settings"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {saveError && <InlineError message={saveError} />}

        {/* AI Tone — segmented control */}
        <FormField label="AI Follow-up Tone">
          <div className="flex rounded-lg border border-input bg-background p-0.5 gap-0.5">
            {AI_TONES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setAiTone(value)}
                className={cn(
                  "flex-1 rounded-md py-2 text-sm font-medium transition-all",
                  aiTone === value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground/70 mt-1">
            {aiTone === "FORMAL" && "Professional and courteous language"}
            {aiTone === "FRIENDLY" && "Warm and conversational language"}
            {aiTone === "FIRM" && "Direct and assertive language"}
          </p>
        </FormField>

        {/* Read Receipts toggle */}
        <div className="flex items-center justify-between rounded-lg border border-border bg-background/50 px-4 py-3.5">
          <div className="flex items-center gap-3">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">Read Receipts</p>
              <p className="text-xs text-muted-foreground">
                Track when clients view your invoices
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={readReceipts}
            onClick={() => setReadReceipts((v) => !v)}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full",
              "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              readReceipts ? "bg-primary" : "bg-input"
            )}
          >
            <span
              className={cn(
                "pointer-events-none inline-block h-4.5 w-4.5 rounded-full bg-white shadow-sm",
                "transform transition-transform duration-200",
                readReceipts ? "translate-x-5" : "translate-x-1"
              )}
            />
          </button>
        </div>

        <div className="flex justify-end pt-1">
          <SaveButton loading={saving} />
        </div>
      </form>
    </SettingsCard>
  );
}

// ─── Card 3 — Change Password ─────────────────────────────────────────────────

function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<PasswordErrors>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const strength = getPasswordStrength(newPassword);
  const strengthConfig = STRENGTH_CONFIG[strength];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSaveError(null);
    setSuccess(false);

    const result = passwordSchema.safeParse({
      currentPassword,
      newPassword,
      confirmPassword,
    });

    if (!result.success) {
      const fieldErrors: PasswordErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof PasswordErrors;
        if (field) fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setSaving(true);
    try {
      await accountApi.changePassword({ currentPassword, newPassword });
      // Reset fields on success
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess(true);
      toast("Password changed successfully");
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to change password";
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  const inputClass = cn(
    "w-full rounded-lg border border-input bg-background",
    "px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground",
    "focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
  );

  return (
    <SettingsCard
      icon={Lock}
      title="Change Password"
      subtitle="Keep your account secure with a strong password"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {saveError && <InlineError message={saveError} />}
        {success && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Password updated successfully
          </div>
        )}

        <FormField label="Current Password" error={errors.currentPassword}>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="••••••••"
            className={inputClass}
          />
        </FormField>

        <FormField label="New Password" error={errors.newPassword}>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            placeholder="••••••••"
            className={inputClass}
          />
          {/* Strength indicator */}
          {newPassword.length > 0 && (
            <div className="mt-2 space-y-1">
              <div className="flex gap-1">
                {[1, 2, 3].map((bar) => (
                  <div
                    key={bar}
                    className={cn(
                      "h-1 flex-1 rounded-full transition-colors duration-300",
                      bar <= strengthConfig.bars
                        ? strengthConfig.color
                        : "bg-muted"
                    )}
                  />
                ))}
              </div>
              <p className={cn(
                "text-xs font-medium",
                strength === "weak" && "text-red-400",
                strength === "medium" && "text-amber-400",
                strength === "strong" && "text-emerald-400",
              )}>
                {strengthConfig.label} password
              </p>
            </div>
          )}
        </FormField>

        <FormField label="Confirm New Password" error={errors.confirmPassword}>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            placeholder="••••••••"
            className={inputClass}
          />
        </FormField>

        <div className="flex justify-end pt-1">
          <SaveButton loading={saving} label="Update password" />
        </div>
      </form>
    </SettingsCard>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AccountPage() {
  const { isLoading, error } = useAccount();

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-2xl px-6 py-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Account Settings
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your business profile, preferences, and security
          </p>
        </div>

        {/* Top-level fetch error */}
        {error && (
          <div className="mb-6">
            <InlineError message={`Failed to load account: ${error}`} />
          </div>
        )}

        {isLoading ? (
          <AccountSkeleton />
        ) : (
          <div className="space-y-6">
            <BusinessDetailsCard />
            <PreferencesCard />
            <ChangePasswordCard />
          </div>
        )}
      </div>
    </div>
  );
}
