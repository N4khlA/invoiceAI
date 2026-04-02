"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Plus, Trash2, Bot, Loader2 } from "lucide-react";
import Link from "next/link";
import { api, extractError } from "@/lib/api";
import { invoiceSchema, InvoiceFormValues } from "@/lib/validations";
import { useClients } from "@/hooks/useClients";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/formatters";

function calcLine(qty: number, unit: number, tax: number) {
  const sub = qty * unit;
  return sub + sub * (tax / 100);
}

export default function NewInvoicePage() {
  const router = useRouter();
  const { clients } = useClients({ pageSize: 100 });
  const [serverError, setServerError] = useState<string | null>(null);
  const [generatingNotes, setGeneratingNotes] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      currency: "USD",
      lineItems: [{ description: "", quantity: 1, unitPrice: 0, taxPercent: 0 }],
      issueDate: new Date().toISOString().split("T")[0],
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "lineItems" });
  const lineItems = watch("lineItems");

  const totals = lineItems.reduce(
    (acc, item) => {
      const qty = Number(item.quantity) || 0;
      const unit = Number(item.unitPrice) || 0;
      const tax = Number(item.taxPercent) || 0;
      const sub = qty * unit;
      const taxAmt = sub * (tax / 100);
      return { sub: acc.sub + sub, tax: acc.tax + taxAmt };
    },
    { sub: 0, tax: 0 }
  );

  const handleGenerateNotes = async () => {
    const clientId = getValues("clientId");
    const desc = lineItems.map((i) => i.description).filter(Boolean).join(", ");
    if (!desc) return;
    setGeneratingNotes(true);
    try {
      const { data } = await api.post<{ notes: string }>("/ai/generate-notes", {
        clientId,
        description: desc,
      });
      setValue("notes", data.notes);
    } catch {
      // best effort
    } finally {
      setGeneratingNotes(false);
    }
  };

  const onSubmit = async (values: InvoiceFormValues) => {
    setServerError(null);
    try {
      const { data } = await api.post<{ id: string }>("/invoices", values);
      router.push(`/invoices/${data.id}`);
    } catch (err) {
      setServerError(extractError(err));
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/invoices"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <h1 className="text-2xl font-bold text-foreground">New Invoice</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {serverError && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
            {serverError}
          </div>
        )}

        {/* Client & dates */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1 sm:col-span-1">
              <label className="text-sm font-medium text-foreground" htmlFor="clientId">
                Client *
              </label>
              <select
                id="clientId"
                className={cn(
                  "w-full rounded-lg border bg-card px-3 py-2.5 text-sm text-foreground",
                  "focus:outline-none focus:ring-2 focus:ring-primary/50",
                  errors.clientId ? "border-destructive" : "border-border"
                )}
                {...register("clientId")}
              >
                <option value="">Select a client…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.clientId && (
                <p className="text-xs text-destructive">{errors.clientId.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground" htmlFor="issueDate">
                Issue Date *
              </label>
              <input
                id="issueDate"
                type="date"
                className={cn(
                  "w-full rounded-lg border bg-card px-3 py-2.5 text-sm text-foreground",
                  "focus:outline-none focus:ring-2 focus:ring-primary/50",
                  errors.issueDate ? "border-destructive" : "border-border"
                )}
                {...register("issueDate")}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground" htmlFor="dueDate">
                Due Date *
              </label>
              <input
                id="dueDate"
                type="date"
                className={cn(
                  "w-full rounded-lg border bg-card px-3 py-2.5 text-sm text-foreground",
                  "focus:outline-none focus:ring-2 focus:ring-primary/50",
                  errors.dueDate ? "border-destructive" : "border-border"
                )}
                {...register("dueDate")}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground" htmlFor="currency">
                Currency
              </label>
              <select
                id="currency"
                className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                {...register("currency")}
              >
                {["USD", "EUR", "GBP", "BRL", "CAD", "AUD"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground" htmlFor="poNumber">
                PO Number
              </label>
              <input
                id="poNumber"
                type="text"
                placeholder="Optional"
                className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                {...register("poNumber")}
              />
            </div>
          </div>
        </div>

        {/* Line items */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Line Items</h2>
            <button
              type="button"
              onClick={() => append({ description: "", quantity: 1, unitPrice: 0, taxPercent: 0 })}
              className="flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Line
            </button>
          </div>

          <div className="divide-y divide-border">
            {fields.map((field, idx) => {
              const item = lineItems[idx] ?? {};
              const lineTotal = calcLine(
                Number(item.quantity) || 0,
                Number(item.unitPrice) || 0,
                Number(item.taxPercent) || 0
              );
              return (
                <div key={field.id} className="px-6 py-4">
                  <div className="grid grid-cols-[2fr_80px_100px_80px_auto_24px] gap-3 items-start">
                    <div>
                      {idx === 0 && <p className="text-xs text-muted-foreground mb-1">Description</p>}
                      <input
                        type="text"
                        placeholder="Line item description…"
                        className={cn(
                          "w-full rounded-lg border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground",
                          "focus:outline-none focus:ring-2 focus:ring-primary/50",
                          errors.lineItems?.[idx]?.description ? "border-destructive" : "border-border"
                        )}
                        {...register(`lineItems.${idx}.description`)}
                      />
                    </div>
                    <div>
                      {idx === 0 && <p className="text-xs text-muted-foreground mb-1">Qty</p>}
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        {...register(`lineItems.${idx}.quantity`, { valueAsNumber: true })}
                      />
                    </div>
                    <div>
                      {idx === 0 && <p className="text-xs text-muted-foreground mb-1">Unit Price</p>}
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        {...register(`lineItems.${idx}.unitPrice`, { valueAsNumber: true })}
                      />
                    </div>
                    <div>
                      {idx === 0 && <p className="text-xs text-muted-foreground mb-1">Tax %</p>}
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        {...register(`lineItems.${idx}.taxPercent`, { valueAsNumber: true })}
                      />
                    </div>
                    <div>
                      {idx === 0 && <p className="text-xs text-muted-foreground mb-1">Total</p>}
                      <p className="py-2 text-sm font-semibold text-foreground text-right">
                        {formatCurrency(lineTotal)}
                      </p>
                    </div>
                    <div className={idx === 0 ? "mt-5" : ""}>
                      {fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => remove(idx)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Totals */}
          <div className="border-t-2 border-border px-6 py-4 space-y-1.5 bg-muted/10">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatCurrency(totals.sub)}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Tax</span>
              <span>{formatCurrency(totals.tax)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-foreground">
              <span>Total</span>
              <span>{formatCurrency(totals.sub + totals.tax)}</span>
            </div>
          </div>
        </div>

        {/* Notes & Terms */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-foreground" htmlFor="notes">
                Notes
              </label>
              <button
                type="button"
                onClick={handleGenerateNotes}
                disabled={generatingNotes}
                className="flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
              >
                {generatingNotes ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Bot className="h-3.5 w-3.5" />
                )}
                AI Generate
              </button>
            </div>
            <textarea
              id="notes"
              rows={4}
              placeholder="Additional notes for the client…"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              {...register("notes")}
            />
          </div>
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <label className="text-sm font-semibold text-foreground" htmlFor="terms">
              Terms & Conditions
            </label>
            <textarea
              id="terms"
              rows={4}
              placeholder="Payment terms, late fees, etc."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              {...register("terms")}
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Link
            href="/invoices"
            className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-indigo-500 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Creating…" : "Create Invoice"}
          </button>
        </div>
      </form>
    </div>
  );
}
