"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { api, extractError } from "@/lib/api";
import { cn } from "@/lib/formatters";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email required"),
  phone: z.string().optional(),
  address: z.string().optional(),
  taxId: z.string().optional(),
  currency: z.string().default("USD"),
  paymentTerms: z.coerce.number().int().min(0).default(30),
  notes: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

function Field({ label, error, children, required }: { label: string; error?: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-foreground">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export default function NewClientPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { currency: "USD", paymentTerms: 30 } });

  const inputCls = (hasErr: boolean) => cn(
    "w-full rounded-lg border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground",
    "focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors",
    hasErr ? "border-destructive" : "border-border"
  );

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      const { data } = await api.post<{ id: string }>("/clients", values);
      router.push("/clients");
    } catch (err) {
      setServerError(extractError(err));
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/clients" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <h1 className="text-2xl font-bold text-foreground">Add Client</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {serverError && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
            {serverError}
          </div>
        )}

        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Basic Info</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Name" error={errors.name?.message} required>
              <input type="text" placeholder="Acme Corp" className={inputCls(!!errors.name)} {...register("name")} />
            </Field>
            <Field label="Email" error={errors.email?.message} required>
              <input type="email" placeholder="billing@acme.com" className={inputCls(!!errors.email)} {...register("email")} />
            </Field>
            <Field label="Phone" error={errors.phone?.message}>
              <input type="tel" placeholder="+1 555 000 0000" className={inputCls(!!errors.phone)} {...register("phone")} />
            </Field>
            <Field label="Tax ID / VAT" error={errors.taxId?.message}>
              <input type="text" placeholder="Optional" className={inputCls(!!errors.taxId)} {...register("taxId")} />
            </Field>
          </div>
          <Field label="Address">
            <textarea rows={3} placeholder="123 Main St, Springfield…" className={cn(inputCls(false), "resize-none")} {...register("address")} />
          </Field>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Billing Preferences</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Default Currency">
              <select className={inputCls(false)} {...register("currency")}>
                {["USD","EUR","GBP","BRL","CAD","AUD"].map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Payment Terms (days)">
              <input type="number" min={0} className={inputCls(false)} {...register("paymentTerms")} />
            </Field>
          </div>
          <Field label="Notes">
            <textarea rows={3} placeholder="Internal notes…" className={cn(inputCls(false), "resize-none")} {...register("notes")} />
          </Field>
        </div>

        <div className="flex justify-end gap-3">
          <Link href="/clients" className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors">
            Cancel
          </Link>
          <button type="submit" disabled={isSubmitting} className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-indigo-500 transition-colors disabled:opacity-50">
            {isSubmitting ? "Saving…" : "Save Client"}
          </button>
        </div>
      </form>
    </div>
  );
}
