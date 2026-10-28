"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Ban, CheckCircle2, Copy, Download, ExternalLink, Pencil, Printer, Send, Sparkles, Trash2 } from "lucide-react";
import { useInvoice, useFollowUps, invoiceApi } from "@/hooks/useInvoices";
import { useAuthStore } from "@/store/authStore";
import { extractError } from "@/lib/api";
import { formatCurrency, formatDate, getDaysOverdue } from "@/lib/formatters";
import type { InvoiceStatus } from "@/types";
import {
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  ErrorState,
  Menu,
  Page,
  PageHeader,
  Skeleton,
  StatusBadge,
  toast,
  type MenuItem,
} from "@/components/ui";
import { InvoicePaper, type PaperParty } from "@/components/invoices/InvoicePaper";
import { StatusTimeline } from "@/components/invoices/StatusTimeline";
import { FollowUpPanel } from "@/components/invoices/FollowUpPanel";
import { AiSuggestionModal } from "@/components/invoices/AiSuggestionModal";

const OPEN: InvoiceStatus[] = ["SENT", "VIEWED", "OVERDUE"];

type Confirm = "send" | "paid" | "void" | "delete" | null;

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { invoice, isLoading, error, refetch } = useInvoice(id);
  const { followUps, isLoading: followUpsLoading, refetch: refetchFollowUps } = useFollowUps(id);

  const [confirm, setConfirm] = useState<Confirm>(null);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  if (error) {
    return (
      <Page>
        <PageHeader title="Invoice" back={{ href: "/invoices", label: "Invoices" }} />
        <ErrorState message={error} onRetry={refetch} />
      </Page>
    );
  }

  if (isLoading || !invoice) {
    return (
      <Page>
        <Skeleton className="mb-8 h-16 w-64" />
        <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
          <Skeleton className="h-[560px] rounded-xl" />
          <Skeleton className="h-[320px] rounded-xl" />
        </div>
      </Page>
    );
  }

  const isOpen = OPEN.includes(invoice.status);
  const publicUrl = typeof window !== "undefined" && invoice.viewToken ? `${window.location.origin}/invoices/view/${invoice.viewToken}` : "";
  const snapshot = invoice.snapshotData;
  const business: PaperParty = snapshot?.business ?? {
    name: user?.bizName,
    email: user?.email,
    address: user?.bizAddress,
    phone: user?.bizPhone,
    website: user?.bizWebsite,
  };
  const client: PaperParty = snapshot?.client ?? invoice.client ?? { name: "—" };

  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await action();
      toast(success);
      setConfirm(null);
      refetch();
    } catch (err) {
      toast(extractError(err), "error");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    try {
      await invoiceApi.delete(id);
      toast(`Draft ${invoice.number} deleted`);
      router.push("/invoices");
    } catch (err) {
      toast(extractError(err), "error");
      setBusy(false);
    }
  };

  const downloadPdf = async () => {
    setDownloading(true);
    try {
      const blob = await invoiceApi.downloadPdf(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${invoice.number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast("PDF generation isn't available right now — use Print instead.", "error");
    } finally {
      setDownloading(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast("Client link copied");
    } catch {
      toast("Couldn't copy — select the link manually.", "error");
    }
  };

  const menu: MenuItem[] = [
    { label: "Print", icon: Printer, onSelect: () => window.print() },
    ...(invoice.status !== "DRAFT" && publicUrl
      ? [{ label: "Open client view", icon: ExternalLink, onSelect: () => window.open(publicUrl, "_blank", "noopener") }]
      : []),
    ...(invoice.status !== "PAID" && invoice.status !== "VOID"
      ? [{ label: "Void invoice", icon: Ban, onSelect: () => setConfirm("void"), destructive: true }]
      : []),
    ...(invoice.status === "DRAFT" ? [{ label: "Delete draft", icon: Trash2, onSelect: () => setConfirm("delete"), destructive: true }] : []),
  ];

  const daysOverdue = invoice.status === "OVERDUE" ? getDaysOverdue(invoice.dueDate) : 0;

  return (
    <Page>
      <PageHeader
        back={{ href: "/invoices", label: "Invoices" }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span className="font-mono">{invoice.number}</span>
            <StatusBadge status={invoice.status} className="font-sans" />
          </span>
        }
        description={
          <>
            {client.name} · <span className="tabular font-medium text-foreground">{formatCurrency(invoice.total, invoice.currency)}</span> ·{" "}
            {invoice.status === "PAID" ? `paid ${formatDate(invoice.paidAt)}` : `due ${formatDate(invoice.dueDate)}`}
          </>
        }
        actions={
          <div className="no-print flex flex-wrap items-center gap-2">
            {invoice.status === "DRAFT" && (
              <>
                <Button asChild variant="outline">
                  <Link href={`/invoices/${id}/edit`}>
                    <Pencil aria-hidden />
                    Edit
                  </Link>
                </Button>
                <Button onClick={() => setConfirm("send")}>
                  <Send aria-hidden />
                  Send invoice
                </Button>
              </>
            )}
            {isOpen && (
              <>
                <Button variant="outline" onClick={() => setAiOpen(true)}>
                  <Sparkles aria-hidden />
                  Send reminder
                </Button>
                <Button onClick={() => setConfirm("paid")}>
                  <CheckCircle2 aria-hidden />
                  Mark as paid
                </Button>
              </>
            )}
            <Button variant="outline" size="icon" onClick={downloadPdf} loading={downloading} aria-label="Download PDF" title="Download PDF">
              {!downloading && <Download aria-hidden />}
            </Button>
            <Menu items={menu} />
          </div>
        }
      />

      {invoice.status === "OVERDUE" && (
        <div role="status" className="no-print mb-6 flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-foreground">
            <span className="font-semibold text-destructive">{daysOverdue === 0 ? "Due today." : `${daysOverdue} days overdue.`}</span>{" "}
            A short, polite reminder usually does the trick.
          </p>
          <Button size="sm" variant="destructive" onClick={() => setAiOpen(true)}>
            <Sparkles aria-hidden />
            Draft a reminder
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
        <InvoicePaper
          number={invoice.number}
          status={invoice.status}
          issueDate={invoice.issueDate}
          dueDate={invoice.dueDate}
          currency={invoice.currency}
          items={invoice.items}
          subtotal={invoice.subtotal}
          taxAmount={invoice.taxAmount}
          total={invoice.total}
          notes={invoice.notes}
          terms={invoice.terms}
          business={business}
          client={client}
          logoUrl={user?.logoUrl}
        />

        <div className="no-print space-y-6">
          {invoice.status !== "DRAFT" && publicUrl && (
            <Card>
              <CardHeader title="Client link" description="Anyone with this link can view the invoice." />
              <div className="flex gap-2 p-5">
                <input
                  readOnly
                  value={publicUrl}
                  aria-label="Client link"
                  onFocus={(e) => e.currentTarget.select()}
                  className="h-10 min-w-0 flex-1 truncate rounded-lg border border-input bg-muted/50 px-3 font-mono text-xs text-muted-foreground"
                />
                <Button variant="outline" size="icon" onClick={copyLink} aria-label="Copy client link">
                  <Copy aria-hidden />
                </Button>
              </div>
            </Card>
          )}

          <Card>
            <CardHeader title="Activity" />
            <div className="p-5">
              <StatusTimeline invoice={invoice} />
            </div>
          </Card>

          {invoice.status !== "DRAFT" && (
            <Card>
              <CardHeader title="Reminders" />
              <div className="p-5">
                <FollowUpPanel followUps={followUps} isLoading={followUpsLoading} />
              </div>
            </Card>
          )}
        </div>
      </div>

      <AiSuggestionModal
        invoiceId={id}
        clientEmail={client.email ?? undefined}
        defaultTone={user?.aiTone === "FORMAL" ? "FORMAL" : user?.aiTone === "PROFESSIONAL" ? "PROFESSIONAL" : "FRIENDLY"}
        open={aiOpen}
        onOpenChange={setAiOpen}
        onSent={refetchFollowUps}
      />

      <ConfirmDialog
        open={confirm === "send"}
        title={`Send ${invoice.number}?`}
        description={`${client.name} will get an email at ${client.email ?? "their address"} with a link to view and download it. Sent invoices can't be edited.`}
        confirmLabel="Send invoice"
        isLoading={busy}
        onConfirm={() => run(() => invoiceApi.send(id), `Invoice ${invoice.number} sent`)}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === "paid"}
        title="Mark as paid?"
        description={`Records ${formatCurrency(invoice.total, invoice.currency)} as received today.`}
        confirmLabel="Mark as paid"
        isLoading={busy}
        onConfirm={() => run(() => invoiceApi.markPaid(id), "Marked as paid — nice!")}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === "void"}
        title={`Void ${invoice.number}?`}
        description="The invoice stays in your records but is no longer payable. This can't be undone."
        confirmLabel="Void invoice"
        destructive
        isLoading={busy}
        onConfirm={() => run(() => invoiceApi.void(id), `Invoice ${invoice.number} voided`)}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === "delete"}
        title="Delete this draft?"
        description="This permanently removes the draft. This can't be undone."
        confirmLabel="Delete draft"
        destructive
        isLoading={busy}
        onConfirm={handleDelete}
        onCancel={() => setConfirm(null)}
      />
    </Page>
  );
}
