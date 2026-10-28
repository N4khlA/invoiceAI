"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Send, Trash2, UserPlus } from "lucide-react";
import { extractError } from "@/lib/api";
import { invoiceSchema, InvoiceFormValues } from "@/lib/validations";
import { useClients } from "@/hooks/useClients";
import { invoiceApi } from "@/hooks/useInvoices";
import { useAuthStore } from "@/store/authStore";
import { CURRENCIES, cn, formatCurrency, toDateInput } from "@/lib/formatters";
import type { Invoice } from "@/types";
import { Button, Card, CardHeader, Field, Input, Select, Textarea, toast } from "@/components/ui";
import { FormError } from "@/components/auth/PasswordInput";

const DUE_PRESETS = [
  { label: "On receipt", days: 0 },
  { label: "Net 7", days: 7 },
  { label: "Net 14", days: 14 },
  { label: "Net 30", days: 30 },
];

function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toDateInput(d);
}

const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

interface InvoiceFormProps {
  /** Existing DRAFT to edit. Client, issue date and currency are fixed once created. */
  invoice?: Invoice;
  defaultClientId?: string;
}

export function InvoiceForm({ invoice, defaultClientId }: InvoiceFormProps) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { clients, isLoading: clientsLoading } = useClients({ limit: 100 });
  const [serverError, setServerError] = useState<string | null>(null);
  const [intent, setIntent] = useState<"save" | "send">("save");
  const isEdit = Boolean(invoice);

  const today = toDateInput(new Date());
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: invoice
      ? {
          clientId: invoice.clientId,
          issueDate: invoice.issueDate.slice(0, 10),
          dueDate: invoice.dueDate.slice(0, 10),
          currency: invoice.currency,
          notes: invoice.notes ?? "",
          terms: invoice.terms ?? "",
          lineItems: invoice.items.map((i) => ({
            description: i.description,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            taxPct: i.taxPct,
          })),
        }
      : {
          clientId: defaultClientId ?? "",
          issueDate: today,
          dueDate: addDays(today, 14),
          currency: user?.currency ?? "USD",
          notes: "",
          terms: "",
          lineItems: [{ description: "", quantity: 1, unitPrice: 0, taxPct: 0 }],
        },
  });

  // Pre-select once clients load (the select needs the option to exist)
  useEffect(() => {
    if (!isEdit && defaultClientId && clients.some((c) => c.id === defaultClientId)) {
      setValue("clientId", defaultClientId);
    }
  }, [clients, defaultClientId, isEdit, setValue]);

  const { fields, append, remove } = useFieldArray({ control, name: "lineItems" });
  const lineItems = watch("lineItems");
  const currency = watch("currency");
  const issueDate = watch("issueDate");
  const dueDate = watch("dueDate");

  const totals = useMemo(
    () =>
      lineItems.reduce(
        (acc, item) => {
          const sub = num(item.quantity) * num(item.unitPrice);
          const tax = sub * (num(item.taxPct) / 100);
          return { sub: acc.sub + sub, tax: acc.tax + tax };
        },
        { sub: 0, tax: 0 }
      ),
    [lineItems]
  );

  const onSubmit = async (values: InvoiceFormValues) => {
    setServerError(null);
    const payload = {
      dueDate: values.dueDate,
      notes: values.notes || undefined,
      terms: values.terms || undefined,
      lineItems: values.lineItems,
    };
    try {
      const saved = invoice
        ? await invoiceApi.update(invoice.id, payload)
        : await invoiceApi.create({
            ...payload,
            clientId: values.clientId,
            issueDate: values.issueDate,
            currency: values.currency,
          });

      if (intent === "send") {
        await invoiceApi.send(saved.id);
        toast(`Invoice ${saved.number} sent`);
      } else {
        toast(isEdit ? "Draft updated" : `Draft ${saved.number} saved`);
      }
      router.push(`/invoices/${saved.id}`);
    } catch (err) {
      setServerError(extractError(err));
    }
  };

  const noClients = !clientsLoading && clients.length === 0;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0 space-y-6">
        <FormError message={serverError} />

        {/* Details */}
        <Card>
          <CardHeader title="Details" />
          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              {noClients ? (
                <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border p-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">You need a client before you can invoice.</p>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/clients/new?returnTo=/invoices/new">
                      <UserPlus aria-hidden />
                      Add a client
                    </Link>
                  </Button>
                </div>
              ) : (
                <Field label="Bill to" error={errors.clientId?.message} hint={isEdit ? "The client can't be changed after creation." : undefined}>
                  <Select disabled={isEdit || clientsLoading} {...register("clientId")}>
                    <option value="">{clientsLoading ? "Loading clients…" : "Choose a client"}</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                        {c.company && c.company !== c.name ? ` — ${c.company}` : ""}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
              {!noClients && !isEdit && (
                <Link href="/clients/new?returnTo=/invoices/new" className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                  <Plus className="size-3" aria-hidden />
                  New client
                </Link>
              )}
            </div>

            <Field label="Issue date" error={errors.issueDate?.message}>
              <Input type="date" disabled={isEdit} {...register("issueDate")} />
            </Field>
            <Field label="Currency">
              <Select disabled={isEdit} {...register("currency")}>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            </Field>

            <div className="space-y-2 sm:col-span-2">
              <Field label="Due date" error={errors.dueDate?.message}>
                <Input type="date" min={issueDate} {...register("dueDate")} />
              </Field>
              <div className="flex flex-wrap gap-1.5" aria-label="Payment terms presets">
                {DUE_PRESETS.map((p) => {
                  const value = addDays(issueDate || today, p.days);
                  const active = dueDate === value;
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setValue("dueDate", value, { shouldValidate: true })}
                      aria-pressed={active}
                      className={cn(
                        "h-8 cursor-pointer rounded-full border px-3 text-xs font-medium transition-colors",
                        active ? "border-primary bg-accent text-accent-foreground" : "border-border text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>

        {/* Line items */}
        <Card>
          <CardHeader title="Line items" description="Quantity × rate, with optional tax per line." />
          <div className="p-5">
            <div className="mb-2 hidden grid-cols-[1fr_88px_120px_80px_110px_40px] gap-3 text-xs font-medium uppercase tracking-wide text-muted-foreground md:grid">
              <span>Description</span>
              <span>Qty</span>
              <span>Rate</span>
              <span>Tax %</span>
              <span className="text-right">Amount</span>
              <span className="sr-only">Remove</span>
            </div>

            <ol className="space-y-3">
              {fields.map((field, idx) => {
                const item = lineItems[idx];
                const amount = num(item?.quantity) * num(item?.unitPrice) * (1 + num(item?.taxPct) / 100);
                const err = errors.lineItems?.[idx];
                return (
                  <li
                    key={field.id}
                    className="grid grid-cols-2 gap-3 rounded-lg border border-border p-3 md:grid-cols-[1fr_88px_120px_80px_110px_40px] md:items-start md:border-0 md:p-0"
                  >
                    <div className="col-span-2 md:col-span-1">
                      <Input
                        placeholder="e.g. Website redesign"
                        aria-label={`Line ${idx + 1} description`}
                        aria-invalid={err?.description ? true : undefined}
                        {...register(`lineItems.${idx}.description`)}
                      />
                      {err?.description && <p className="mt-1 text-xs text-destructive">{err.description.message}</p>}
                    </div>
                    {(["quantity", "unitPrice", "taxPct"] as const).map((key) => (
                      <div key={key}>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground md:sr-only" htmlFor={`${field.id}-${key}`}>
                          {key === "quantity" ? "Qty" : key === "unitPrice" ? "Rate" : "Tax %"}
                        </label>
                        <Controller
                          control={control}
                          name={`lineItems.${idx}.${key}`}
                          render={({ field: f }) => (
                            <Input
                              id={`${field.id}-${key}`}
                              type="number"
                              inputMode="decimal"
                              step="any"
                              min={0}
                              className="tabular"
                              aria-invalid={err?.[key] ? true : undefined}
                              value={Number.isNaN(f.value) ? "" : f.value}
                              onChange={(e) => f.onChange(e.target.value === "" ? NaN : e.target.valueAsNumber)}
                              onBlur={f.onBlur}
                            />
                          )}
                        />
                        {err?.[key] && <p className="mt-1 text-xs text-destructive">{err[key]?.message}</p>}
                      </div>
                    ))}
                    <div className="flex items-center justify-between md:block md:pt-2.5 md:text-right">
                      <span className="text-xs font-medium text-muted-foreground md:hidden">Amount</span>
                      <span className="tabular text-sm font-semibold text-foreground">{formatCurrency(amount, currency)}</span>
                    </div>
                    <div className="col-span-2 flex justify-end md:col-span-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(idx)}
                        disabled={fields.length === 1}
                        aria-label={`Remove line ${idx + 1}`}
                        className="hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 aria-hidden />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ol>

            {typeof errors.lineItems?.message === "string" && (
              <p className="mt-2 text-xs text-destructive">{errors.lineItems.message}</p>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => append({ description: "", quantity: 1, unitPrice: 0, taxPct: lineItems.at(-1)?.taxPct ?? 0 })}
              disabled={fields.length >= 50}
            >
              <Plus aria-hidden />
              Add line
            </Button>
          </div>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader title="Notes & terms" description="Shown at the bottom of the invoice." />
          <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
            <Field label="Notes" optional error={errors.notes?.message}>
              <Textarea rows={4} placeholder="Thanks for your business!" {...register("notes")} />
            </Field>
            <Field label="Payment terms" optional error={errors.terms?.message}>
              <Textarea rows={4} placeholder="Bank transfer to IBAN … Please include the invoice number." {...register("terms")} />
            </Field>
          </div>
        </Card>
      </div>

      {/* Summary */}
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <Card>
          <CardHeader title="Summary" />
          <dl className="tabular space-y-2.5 p-5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <dt>Subtotal</dt>
              <dd>{formatCurrency(totals.sub, currency)}</dd>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <dt>Tax</dt>
              <dd>{formatCurrency(totals.tax, currency)}</dd>
            </div>
            <div className="flex items-baseline justify-between border-t border-border pt-3">
              <dt className="font-semibold text-foreground">Total</dt>
              <dd className="font-display text-2xl font-bold text-foreground">{formatCurrency(totals.sub + totals.tax, currency)}</dd>
            </div>
          </dl>
          <div className="space-y-2 border-t border-border p-5">
            <Button
              type="submit"
              className="w-full"
              onClick={() => setIntent("send")}
              loading={isSubmitting && intent === "send"}
              disabled={isSubmitting || noClients}
            >
              {!(isSubmitting && intent === "send") && <Send aria-hidden />}
              {isEdit ? "Save & send" : "Create & send"}
            </Button>
            <Button
              type="submit"
              variant="outline"
              className="w-full"
              onClick={() => setIntent("save")}
              loading={isSubmitting && intent === "save"}
              disabled={isSubmitting || noClients}
            >
              {isEdit ? "Save draft" : "Save as draft"}
            </Button>
            <p className="pt-1 text-center text-xs text-muted-foreground">
              Sending emails your client a secure link and a PDF.
            </p>
          </div>
        </Card>
      </aside>
    </form>
  );
}
