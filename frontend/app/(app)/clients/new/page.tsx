"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, Page, PageHeader, toast } from "@/components/ui";
import { ClientForm } from "@/components/clients/ClientForm";

function NewClient() {
  const router = useRouter();
  const returnTo = useSearchParams().get("returnTo");
  const safeReturn = returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : null;

  return (
    <Page className="max-w-3xl">
      <PageHeader
        title="New client"
        description="Saved clients appear in the “Bill to” list when you create an invoice."
        back={safeReturn ? { href: safeReturn, label: "Back" } : { href: "/clients", label: "Clients" }}
      />
      <Card className="p-5 sm:p-6">
        <ClientForm
          submitLabel={safeReturn?.startsWith("/invoices/new") ? "Add client & continue" : "Add client"}
          onCancel={() => router.back()}
          onSaved={(client) => {
            toast(`${client.name} added`);
            router.push(safeReturn?.startsWith("/invoices/new") ? `/invoices/new?client=${client.id}` : `/clients/${client.id}`);
          }}
        />
      </Card>
    </Page>
  );
}

export default function NewClientPage() {
  return (
    <Suspense>
      <NewClient />
    </Suspense>
  );
}
