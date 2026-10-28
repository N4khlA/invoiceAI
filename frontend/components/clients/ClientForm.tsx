"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { extractError } from "@/lib/api";
import { clientApi } from "@/hooks/useClients";
import { clientSchema, ClientFormValues } from "@/lib/validations";
import type { Client } from "@/types";
import { Button, Field, Input, Textarea } from "@/components/ui";
import { FormError } from "@/components/auth/PasswordInput";

/** Create or edit a client. Empty optional fields are sent as "" so they can be cleared. */
export function ClientForm({
  client,
  onSaved,
  onCancel,
  submitLabel,
}: {
  client?: Client;
  onSaved: (client: Client) => void;
  onCancel?: () => void;
  submitLabel?: string;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: client?.name ?? "",
      email: client?.email ?? "",
      company: client?.company ?? "",
      phone: client?.phone ?? "",
      address: client?.address ?? "",
      notes: client?.notes ?? "",
    },
  });

  const onSubmit = async (values: ClientFormValues) => {
    setServerError(null);
    const payload = {
      name: values.name,
      email: values.email,
      company: values.company ?? "",
      phone: values.phone ?? "",
      address: values.address ?? "",
      notes: values.notes ?? "",
    };
    try {
      const saved = client ? await clientApi.update(client.id, payload) : await clientApi.create(payload);
      onSaved(saved);
    } catch (err) {
      setServerError(extractError(err));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <FormError message={serverError} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Contact name" error={errors.name?.message}>
          <Input autoComplete="off" placeholder="Sarah Chen" {...register("name")} />
        </Field>
        <Field label="Email" error={errors.email?.message} hint="Invoices and reminders go here.">
          <Input type="email" autoComplete="off" placeholder="billing@client.com" {...register("email")} />
        </Field>
        <Field label="Company" optional error={errors.company?.message}>
          <Input autoComplete="off" placeholder="Beacon Digital Ltd" {...register("company")} />
        </Field>
        <Field label="Phone" optional error={errors.phone?.message}>
          <Input type="tel" autoComplete="off" placeholder="+1 555 010 0100" {...register("phone")} />
        </Field>
        <Field label="Billing address" optional error={errors.address?.message} className="sm:col-span-2">
          <Textarea rows={3} placeholder={"45 Tech Park\nAustin, TX 78701"} {...register("address")} />
        </Field>
        <Field label="Private notes" optional error={errors.notes?.message} hint="Only you can see these." className="sm:col-span-2">
          <Textarea rows={3} {...register("notes")} />
        </Field>
      </div>
      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={isSubmitting} disabled={Boolean(client) && !isDirty}>
          {submitLabel ?? (client ? "Save changes" : "Add client")}
        </Button>
      </div>
    </form>
  );
}
