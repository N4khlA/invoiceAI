"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import {
  useInvoice,
  useFollowUps,
  useGenerateAiSuggestion,
  useSendFollowUp,
} from "@/hooks/useInvoices";
import { invoiceApi } from "@/hooks/useInvoices";
import { formatCurrency } from "@/lib/formatters";
import { AiTone, InvoiceStatus } from "@/types";
import {
  ArrowLeft,
  Send,
  Download,
  Bot,
  CheckCircle,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/formatters";
import { StatusTimeline } from "@/components/invoices/StatusTimeline";
import { FollowUpPanel } from "@/components/invoices/FollowUpPanel";
import { AiSuggestionModal } from "@/components/invoices/AiSuggestionModal";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  SENT: "bg-blue-500/15 text-blue-400",
  VIEWED: "bg-purple-500/15 text-purple-400",
  OVERDUE: "bg-red-500/15 text-red-400",
  PAID: "bg-emerald-500/15 text-emerald-400",
  VOID: "bg-zinc-500/15 text-zinc-400",
};

const CAN_FOLLOW_UP: InvoiceStatus[] = ["SENT", "VIEWED", "OVERDUE"];

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();

  // Data
  const { invoice, isLoading, error, refetch } = useInvoice(id);
  const { followUps, isLoading: followUpsLoading, refetch: refetchFollowUps } =
    useFollowUps(id);

  // Actions
  const { suggestion, isGenerating, generate } = useGenerateAiSuggestion(id);
  const { isSending, sendFollowUp } = useSendFollowUp(id);

  // UI state
  const [isSendingInvoice, setIsSendingInvoice] = useState(false);
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);
  const [isVoiding, setIsVoiding] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [tone, setTone] = useState<AiTone>("FRIENDLY");

  // ── Derived flags ──────────────────────────────────────────────────────────
  if (error)
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-destructive text-sm">{error}</p>
      </div>
    );

  if (isLoading || !invoice)
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="rounded-xl h-16 bg-muted/20 animate-pulse" />
        ))}
      </div>
    );

  const canSend = invoice.status === "DRAFT";
  const canMarkPaid =
    invoice.status !== "PAID" &&
    invoice.status !== "VOID" &&
    invoice.status !== "DRAFT";
  const canVoid = invoice.status !== "PAID" && invoice.status !== "VOID";
  const canFollowUp = (CAN_FOLLOW_UP as string[]).includes(invoice.status);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleSend = async () => {
    setIsSendingInvoice(true);
    try {
      await invoiceApi.send(id);
      refetch();
    } finally {
      setIsSendingInvoice(false);
    }
  };

  const handleMarkPaid = async () => {
    setIsMarkingPaid(true);
    try {
      await invoiceApi.markPaid(id);
      refetch();
    } finally {
      setIsMarkingPaid(false);
    }
  };

  const handleVoid = async () => {
    if (!confirm("Void this invoice? This cannot be undone.")) return;
    setIsVoiding(true);
    try {
      await invoiceApi.void(id);
      refetch();
    } finally {
      setIsVoiding(false);
    }
  };

  const handleOpenAiModal = async () => {
    setAiModalOpen(true);
    if (!suggestion) {
      await generate(tone);
    }
  };

  const handleToneChange = async (newTone: AiTone) => {
    setTone(newTone);
    await generate(newTone);
  };

  const handleSendFollowUp = async (subject: string, body: string) => {
    await sendFollowUp(subject, body);
    setAiModalOpen(false);
    refetchFollowUps();
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* AI Follow-up Modal */}
      <AiSuggestionModal
        open={aiModalOpen}
        suggestion={suggestion}
        isGenerating={isGenerating}
        isSending={isSending}
        tone={tone}
        onToneChange={handleToneChange}
        onRegenerate={() => generate(tone)}
        onSend={handleSendFollowUp}
        onClose={() => setAiModalOpen(false)}
      />

      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Top nav ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <Link
            href="/invoices"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            All Invoices
          </Link>
          <div className="flex gap-2 flex-wrap justify-end">
            {canSend && (
              <button
                onClick={handleSend}
                disabled={isSendingInvoice}
                className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-indigo-500 transition-colors disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {isSendingInvoice ? "Sending…" : "Send Invoice"}
              </button>
            )}
            {canFollowUp && (
              <button
                onClick={handleOpenAiModal}
                className="flex items-center gap-2 rounded-lg bg-violet-600/80 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-500 transition-colors"
              >
                <Bot className="h-4 w-4" />
                AI Follow-up
              </button>
            )}
            {canMarkPaid && (
              <button
                onClick={handleMarkPaid}
                disabled={isMarkingPaid}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors disabled:opacity-50"
              >
                <CheckCircle className="h-4 w-4" />
                {isMarkingPaid ? "Updating…" : "Mark Paid"}
              </button>
            )}
            <a
              href={`/api/invoices/${id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
            >
              <Download className="h-4 w-4" />
              PDF
            </a>
            {canVoid && (
              <button
                onClick={handleVoid}
                disabled={isVoiding}
                className="flex items-center gap-2 rounded-lg border border-destructive/40 px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                {isVoiding ? "Voiding…" : "Void"}
              </button>
            )}
          </div>
        </div>

        {/* Invoice header card ─────────────────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1 font-mono">
                {invoice.invoiceNumber}
              </p>
              <h1 className="text-xl font-bold text-foreground">
                {invoice.client?.name ?? "Unknown Client"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {invoice.client?.email}
              </p>
            </div>
            <span
              className={cn(
                "rounded-full px-3 py-1 text-sm font-medium shrink-0",
                STATUS_STYLES[invoice.status]
              )}
            >
              {invoice.status}
            </span>
          </div>

          {/* Status timeline */}
          <StatusTimeline invoice={invoice} />

          {/* Key dates + total */}
          <div className="grid grid-cols-3 gap-4 text-sm pt-1">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Issue Date</p>
              <p className="text-foreground font-medium">
                {new Date(invoice.issueDate).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Due Date</p>
              <p className="text-foreground font-medium">
                {new Date(invoice.dueDate).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Total</p>
              <p className="text-2xl font-bold text-foreground">
                {formatCurrency(invoice.total)}
              </p>
            </div>
          </div>
        </div>

        {/* Line items ──────────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">
              Line Items
            </h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["Description", "Qty", "Unit Price", "Tax", "Total"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-5 py-2.5 text-left text-xs font-medium text-muted-foreground"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {invoice.lineItems.map((item, idx) => (
                <tr key={item.id ?? idx}>
                  <td className="px-5 py-3 text-foreground">
                    {item.description}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {item.quantity}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {formatCurrency(item.unitPrice)}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {item.taxPercent}%
                  </td>
                  <td className="px-5 py-3 font-semibold text-foreground">
                    {formatCurrency(item.lineTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-border">
              <tr>
                <td colSpan={3} />
                <td className="px-5 py-3 text-sm text-muted-foreground">
                  Subtotal
                </td>
                <td className="px-5 py-3 font-medium text-foreground">
                  {formatCurrency(invoice.subtotal)}
                </td>
              </tr>
              <tr>
                <td colSpan={3} />
                <td className="px-5 py-3 text-sm text-muted-foreground">
                  Tax
                </td>
                <td className="px-5 py-3 font-medium text-foreground">
                  {formatCurrency(invoice.taxTotal)}
                </td>
              </tr>
              <tr>
                <td colSpan={3} />
                <td className="px-5 py-3 text-sm font-semibold text-foreground">
                  Total
                </td>
                <td className="px-5 py-3 text-lg font-bold text-foreground">
                  {formatCurrency(invoice.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Follow-up history ───────────────────────────────────────────────── */}
        {canFollowUp && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">
                Follow-up History
              </h2>
              <span className="text-xs text-muted-foreground">
                {followUps.length} sent
              </span>
            </div>
            <div className="p-5">
              <FollowUpPanel
                followUps={followUps}
                isLoading={followUpsLoading}
              />
            </div>
          </div>
        )}

        {/* Notes & Terms ───────────────────────────────────────────────────── */}
        {(invoice.notes || invoice.terms) && (
          <div className="grid grid-cols-2 gap-4">
            {invoice.notes && (
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Notes
                </h3>
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {invoice.notes}
                </p>
              </div>
            )}
            {invoice.terms && (
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Terms
                </h3>
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {invoice.terms}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
