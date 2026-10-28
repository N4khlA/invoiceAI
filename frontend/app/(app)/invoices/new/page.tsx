"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Page, PageHeader } from "@/components/ui";
import { InvoiceForm } from "@/components/invoices/InvoiceForm";

function NewInvoice() {
  const clientId = useSearchParams().get("client") ?? undefined;
  return (
    <Page>
      <PageHeader title="New invoice" back={{ href: "/invoices", label: "Invoices" }} />
      <InvoiceForm defaultClientId={clientId} />
    </Page>
  );
}

export default function NewInvoicePage() {
  return (
    <Suspense>
      <NewInvoice />
    </Suspense>
  );
}
