"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  MapPin,
  Pencil,
  Check,
  X,
  DollarSign,
  TrendingUp,
  AlertCircle,
  FileText,
  ChevronRight,
  Archive,
} from "lucide-react";
import { useClient, clientApi } from "@/hooks/useClients";
import { useInvoices } from "@/hooks/useInvoices";
import { useAuthStore } from "@/store/authStore";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatCurrency, formatDate, cn } from "@/lib/formatters";
import { Currency, InvoiceStatus } from "@/types";

// ─── Status badge styles ───────────────────────────────────────────────────────

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  SENT: "bg-blue-500/15 text-blue-400",
  VIEWED: "bg-purple-500/15 text-purple-400",
  OVERDUE: "bg-red-500/15 text-red-400",
  PAID: "bg-emerald-500/15 text-emerald-400",
  VOID: "bg-zinc-500/15 text-zinc-400",
};

// ─── Inline edit form for client header ───────────────────────────────────────

interface ClientHeaderProps {
  id: string;
  name: string;
  email: string;
  address?: string;
  onSaved: () => void;
}

function ClientHeader({ id, name, email, address, onSaved }: ClientHeaderProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name, email, address: address ?? "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await clientApi.update(id, {
        name: form.name.trim(),
        email: form.email.trim(),
        address: form.address.trim() || undefined,
      });
      onSaved();
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm({ name, email, address: address ?? "" });
    setEditing(false);
    setError(null);
  };

  if (editing) {
    return (
      <div className="rounded-xl border border-primary/50 bg-card p-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className={cn(
                "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground",
                "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              )}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
              className={cn(
                "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground",
                "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              )}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Address
          </label>
          <textarea
            value={form.address}
            onChange={(e) =>
              setForm((f) => ({ ...f, address: e.target.value }))
            }
            rows={2}
            className={cn(
              "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground resize-none",
              "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            )}
          />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving || !form.name.trim() || !form.email.trim()}
            className={cn(
              "flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground",
              "hover:bg-indigo-500 transition-colors disabled:opacity-50"
            )}
          >
            <Check className="h-3.5 w-3.5" />
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            onClick={handleCancel}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-card p-6">
      <div className="space-y-2">
        {/* Avatar + name */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-lg font-bold text-primary uppercase shrink-0">
            {name[0]}
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">{name}</h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 pl-1">
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Mail className="h-3.5 w-3.5 shrink-0" />
            {email}
          </span>
          {address && (
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {address}
            </span>
          )}
        </div>
      </div>
      <button
        onClick={() => setEditing(true)}
        className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
      >
        <Pencil className="h-3.5 w-3.5" />
        Edit
      </button>
    </div>
  );
}

// ─── Summary cards ─────────────────────────────────────────────────────────────

interface SummaryCardsProps {
  totalInvoiced: number;
  totalPaid: number;
  outstanding: number;
  currency: Currency;
}

function SummaryCards({
  totalInvoiced,
  totalPaid,
  outstanding,
  currency,
}: SummaryCardsProps) {

  const cards = [
    {
      label: "Total Invoiced",
      value: formatCurrency(totalInvoiced, currency),
      icon: DollarSign,
      color: "text-blue-400 bg-blue-500/10",
    },
    {
      label: "Total Paid",
      value: formatCurrency(totalPaid, currency),
      icon: TrendingUp,
      color: "text-emerald-400 bg-emerald-500/10",
    },
    {
      label: "Outstanding",
      value: formatCurrency(outstanding, currency),
      icon: AlertCircle,
      color:
        outstanding > 0
          ? "text-red-400 bg-red-500/10"
          : "text-muted-foreground bg-muted",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {cards.map(({ label, value, icon: Icon, color }) => (
        <div
          key={label}
          className="rounded-xl border border-border bg-card p-5 flex items-center gap-4"
        >
          <div className={cn("rounded-lg p-2.5", color)}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-lg font-semibold text-foreground">{value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Invoice table (client-scoped) ────────────────────────────────────────────

function ClientInvoiceTable({ clientId, currency }: { clientId: string; currency: Currency }) {
  const [page, setPage] = useState(1);
  const { invoices, total, totalPages, isLoading, error } = useInvoices({
    clientId,
    page,
    pageSize: 10,
  });

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Invoices</h2>
        <span className="text-xs text-muted-foreground">{total} total</span>
      </div>

      {isLoading ? (
        <div className="divide-y divide-border">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 animate-pulse bg-muted/10" />
          ))}
        </div>
      ) : error ? (
        <div className="py-12 text-center text-sm text-destructive">{error}</div>
      ) : invoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center px-6">
          <FileText className="h-9 w-9 text-muted-foreground mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">
            No invoices yet
          </p>
          <p className="text-xs text-muted-foreground">
            Invoices sent to this client will appear here.
          </p>
        </div>
      ) : (
        <>
          {/* Column headers */}
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_40px] gap-4 px-5 py-2.5 border-b border-border">
            {["Invoice #", "Due Date", "Status", "Amount", ""].map((h) => (
              <span key={h} className="text-xs font-medium text-muted-foreground">
                {h}
              </span>
            ))}
          </div>
          <ul className="divide-y divide-border">
            {invoices.map((inv) => (
              <li key={inv.id}>
                <Link
                  href={`/invoices/${inv.id}`}
                  className="grid grid-cols-[2fr_1fr_1fr_1fr_40px] gap-4 items-center px-5 py-3.5 hover:bg-accent transition-colors"
                >
                  <p className="text-sm font-mono text-foreground">
                    {inv.invoiceNumber}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(inv.dueDate)}
                  </p>
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2 py-0.5 text-xs font-medium w-fit",
                      STATUS_STYLES[inv.status]
                    )}
                  >
                    {inv.status}
                  </span>
                  <p className="text-sm font-semibold text-foreground">
                    {formatCurrency(inv.total, currency)}
                  </p>
                  <ChevronRight className="h-4 w-4 text-muted-foreground justify-self-end" />
                </Link>
              </li>
            ))}
          </ul>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="text-xs text-primary hover:underline disabled:opacity-40 disabled:no-underline"
                >
                  Previous
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="text-xs text-primary hover:underline disabled:opacity-40 disabled:no-underline"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface ClientDetailPageProps {
  params: { id: string };
}

export default function ClientDetailPage({ params }: ClientDetailPageProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const currency: Currency = user?.currency ?? "USD";
  const { client, isLoading, error, refetch } = useClient(params.id);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  const handleArchive = async () => {
    setArchiving(true);
    setArchiveError(null);
    try {
      await clientApi.archive(params.id);
      router.push("/clients");
    } catch (err) {
      setArchiveError(err instanceof Error ? err.message : "Failed to archive");
      setArchiving(false);
      setShowArchiveDialog(false);
    }
  };

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-5">
        <div className="h-6 w-32 rounded animate-pulse bg-muted/30" />
        <div className="h-28 rounded-xl animate-pulse bg-muted/20" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl animate-pulse bg-muted/20" />
          ))}
        </div>
        <div className="h-64 rounded-xl animate-pulse bg-muted/20" />
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <p className="text-sm text-destructive">
          {error ?? "Client not found."}
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5 pb-20">
      {/* Back link */}
      <Link
        href="/clients"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Clients
      </Link>

      {/* Header */}
      <ClientHeader
        id={client.id}
        name={client.name}
        email={client.email}
        address={client.address}
        onSaved={refetch}
      />

      {/* Summary cards */}
      <SummaryCards
        totalInvoiced={client.totalInvoiced}
        totalPaid={client.totalPaid}
        outstanding={client.outstanding}
        currency={currency}
      />

      {/* Invoice table */}
      <ClientInvoiceTable clientId={client.id} currency={currency} />

      {/* Archive section */}
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Archive client
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Existing invoices are kept. The client will be hidden from active
              lists.
            </p>
            {archiveError && (
              <p className="mt-1.5 text-xs text-destructive">{archiveError}</p>
            )}
          </div>
          <button
            onClick={() => setShowArchiveDialog(true)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-lg border border-destructive/50 px-4 py-2",
              "text-sm font-medium text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
            )}
          >
            <Archive className="h-4 w-4" />
            Archive
          </button>
        </div>
      </div>

      {/* Confirm archive dialog */}
      <ConfirmDialog
        open={showArchiveDialog}
        title="Archive this client?"
        description="This will archive the client. Existing invoices are kept and no data will be deleted."
        confirmLabel="Archive client"
        destructive
        isLoading={archiving}
        onConfirm={handleArchive}
        onCancel={() => setShowArchiveDialog(false)}
      />
    </div>
  );
}
