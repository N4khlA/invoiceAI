"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useInvoice } from "@/hooks/useInvoices";
import { Button, EmptyState, ErrorState, Page, PageHeader, Skeleton } from "@/components/ui";
import { InvoiceForm } from "@/components/invoices/InvoiceForm";
import { Lock } from "lucide-react";

export default function EditInvoicePage() {
  const { id } = useParams<{ id: string }>();
  const { invoice, isLoading, error, refetch } = useInvoice(id);

  return (
    <Page>
      <PageHeader
        title={invoice ? `Edit ${invoice.number}` : "Edit invoice"}
        back={{ href: `/invoices/${id}`, label: "Back to invoice" }}
      />
      {error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : isLoading || !invoice ? (
        <Skeleton className="h-[480px] w-full rounded-xl" />
      ) : invoice.status !== "DRAFT" ? (
        <EmptyState
          icon={Lock}
          title="Sent invoices can't be edited"
          description="Void this invoice and create a new one if something needs to change."
          action={
            <Button asChild variant="outline">
              <Link href={`/invoices/${id}`}>Back to invoice</Link>
            </Button>
          }
        />
      ) : (
        <InvoiceForm invoice={invoice} />
      )}
    </Page>
  );
}
