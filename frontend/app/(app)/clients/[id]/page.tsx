"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Archive, ArchiveRestore, FileText, Mail, MapPin, Pencil, Phone, Plus, StickyNote } from "lucide-react";
import { clientApi, useClient } from "@/hooks/useClients";
import { useInvoices } from "@/hooks/useInvoices";
import { useAuthStore } from "@/store/authStore";
import { extractError } from "@/lib/api";
import { formatCurrency } from "@/lib/formatters";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Modal,
  Page,
  PageHeader,
  Pagination,
  Skeleton,
  toast,
} from "@/components/ui";
import { ClientForm } from "@/components/clients/ClientForm";
import { InvoiceTable } from "@/components/invoices/InvoiceTable";

const PAGE_SIZE = 10;

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const currency = useAuthStore((s) => s.user?.currency ?? "USD");
  const { client, isLoading, error, refetch } = useClient(id);
  const [page, setPage] = useState(1);
  const invoices = useInvoices({ clientId: id, page, limit: PAGE_SIZE });
  const [editing, setEditing] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);

  if (error) {
    return (
      <Page>
        <PageHeader title="Client" back={{ href: "/clients", label: "Clients" }} />
        <ErrorState message={error} onRetry={refetch} />
      </Page>
    );
  }

  if (isLoading || !client) {
    return (
      <Page>
        <Skeleton className="mb-8 h-14 w-72" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </Page>
    );
  }

  const toggleArchive = async () => {
    setArchiving(true);
    try {
      if (client.isArchived) await clientApi.unarchive(id);
      else await clientApi.archive(id);
      toast(client.isArchived ? `${client.name} restored` : `${client.name} archived`);
      setArchiveOpen(false);
      refetch();
    } catch (err) {
      toast(extractError(err), "error");
    } finally {
      setArchiving(false);
    }
  };

  const s = client.summary ?? { totalInvoiced: 0, totalPaid: 0, outstanding: 0 };
  const details = [
    { icon: Mail, value: client.email, href: `mailto:${client.email}` },
    { icon: Phone, value: client.phone, href: client.phone ? `tel:${client.phone}` : undefined },
    { icon: MapPin, value: client.address },
    { icon: StickyNote, value: client.notes },
  ].filter((d) => d.value);

  return (
    <Page>
      <PageHeader
        back={{ href: "/clients", label: "Clients" }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {client.name}
            {client.isArchived && <Badge className="border-border bg-muted font-sans text-muted-foreground">Archived</Badge>}
          </span>
        }
        description={client.company && client.company !== client.name ? client.company : undefined}
        actions={
          <>
            <Button variant="outline" onClick={() => setArchiveOpen(true)}>
              {client.isArchived ? <ArchiveRestore aria-hidden /> : <Archive aria-hidden />}
              {client.isArchived ? "Restore" : "Archive"}
            </Button>
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil aria-hidden />
              Edit
            </Button>
            {!client.isArchived && (
              <Button asChild>
                <Link href={`/invoices/new?client=${client.id}`}>
                  <Plus aria-hidden />
                  New invoice
                </Link>
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Total invoiced", value: s.totalInvoiced },
          { label: "Paid", value: s.totalPaid },
          { label: "Outstanding", value: s.outstanding },
        ].map((t) => (
          <Card key={t.label} className="p-5">
            <p className="text-sm font-medium text-muted-foreground">{t.label}</p>
            <p className="tabular mt-2 font-display text-2xl font-bold text-foreground">{formatCurrency(t.value, currency)}</p>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="self-start">
          <CardHeader title="Contact" />
          <ul className="space-y-4 p-5">
            {details.map(({ icon: Icon, value, href }) => (
              <li key={String(value)} className="flex gap-3 text-sm">
                <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                {href ? (
                  <a href={href} className="break-all text-foreground hover:text-primary hover:underline">
                    {value}
                  </a>
                ) : (
                  <p className="whitespace-pre-line text-foreground">{value}</p>
                )}
              </li>
            ))}
          </ul>
        </Card>

        <Card className="min-w-0 overflow-hidden">
          <CardHeader title="Invoices" description={invoices.isLoading ? undefined : `${invoices.total} for this client`} />
          {invoices.error ? (
            <ErrorState message={invoices.error} onRetry={invoices.refetch} />
          ) : !invoices.isLoading && invoices.invoices.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No invoices yet"
              description={`Bill ${client.name} for the first time.`}
              action={
                !client.isArchived && (
                  <Button asChild>
                    <Link href={`/invoices/new?client=${client.id}`}>
                      <Plus aria-hidden />
                      New invoice
                    </Link>
                  </Button>
                )
              }
            />
          ) : (
            <>
              <InvoiceTable invoices={invoices.invoices} isLoading={invoices.isLoading} hideClient />
              <Pagination page={page} totalPages={invoices.totalPages} total={invoices.total} pageSize={PAGE_SIZE} onPageChange={setPage} />
            </>
          )}
        </Card>
      </div>

      <Modal open={editing} onOpenChange={setEditing} title="Edit client" className="sm:max-w-2xl">
        <div>
          <ClientForm
            client={client}
            onCancel={() => setEditing(false)}
            onSaved={() => {
              toast("Client updated");
              setEditing(false);
              refetch();
            }}
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={archiveOpen}
        title={client.isArchived ? `Restore ${client.name}?` : `Archive ${client.name}?`}
        description={
          client.isArchived
            ? "They'll show up again in your client list and the “Bill to” picker."
            : "They'll be hidden from your client list and new invoices. Existing invoices are kept."
        }
        confirmLabel={client.isArchived ? "Restore" : "Archive"}
        isLoading={archiving}
        onConfirm={toggleArchive}
        onCancel={() => setArchiveOpen(false)}
      />
    </Page>
  );
}
