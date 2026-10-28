"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Send, Sparkles } from "lucide-react";
import type { AiTone } from "@/types";
import { extractError } from "@/lib/api";
import { invoiceApi } from "@/hooks/useInvoices";
import { cn } from "@/lib/formatters";
import { Button, Field, Input, Modal, Skeleton, Textarea, toast } from "@/components/ui";

const TONES: { value: AiTone; label: string; hint: string }[] = [
  { value: "FRIENDLY", label: "Friendly", hint: "Warm nudge" },
  { value: "PROFESSIONAL", label: "Professional", hint: "Clear & concise" },
  { value: "FORMAL", label: "Formal", hint: "Firm & courteous" },
];

interface Props {
  invoiceId: string;
  clientEmail?: string;
  defaultTone?: AiTone;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSent: () => void;
}

/** Draft a payment reminder with AI, edit it, and email it to the client. */
export function AiSuggestionModal({ invoiceId, clientEmail, defaultTone = "FRIENDLY", open, onOpenChange, onSent }: Props) {
  const [tone, setTone] = useState<AiTone>(defaultTone);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async (t: AiTone) => {
      setGenerating(true);
      setError(null);
      try {
        const s = await invoiceApi.getAiSuggestion(invoiceId, t);
        setSubject(s.subject);
        setBody(s.body);
      } catch (err) {
        setError(extractError(err));
      } finally {
        setGenerating(false);
      }
    },
    [invoiceId]
  );

  useEffect(() => {
    if (open) void generate(tone);
    // Only when opening — tone changes trigger their own generate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const pickTone = (t: AiTone) => {
    setTone(t);
    void generate(t);
  };

  const send = async () => {
    setSending(true);
    try {
      await invoiceApi.sendFollowUp(invoiceId, subject.trim(), body.trim());
      toast("Reminder sent");
      onOpenChange(false);
      onSent();
    } catch (err) {
      toast(extractError(err), "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !sending && onOpenChange(o)}
      title={
        <span className="inline-flex items-center gap-2">
          <Sparkles className="size-5 text-primary" aria-hidden />
          Payment reminder
        </span>
      }
      description={clientEmail ? `Drafted for you — edit anything, then send to ${clientEmail}.` : "Drafted for you — edit anything, then send."}
      className="sm:max-w-xl"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={send} loading={sending} disabled={generating || !subject.trim() || !body.trim()}>
            {!sending && <Send aria-hidden />}
            Send reminder
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div role="radiogroup" aria-label="Tone" className="grid grid-cols-3 gap-2">
          {TONES.map((t) => (
            <button
              key={t.value}
              type="button"
              role="radio"
              aria-checked={tone === t.value}
              onClick={() => pickTone(t.value)}
              disabled={generating}
              className={cn(
                "cursor-pointer rounded-lg border px-3 py-2 text-left transition-colors disabled:cursor-wait",
                tone === t.value ? "border-primary bg-accent" : "border-border hover:border-muted-foreground/40"
              )}
            >
              <span className={cn("block text-sm font-semibold", tone === t.value ? "text-accent-foreground" : "text-foreground")}>{t.label}</span>
              <span className="block text-xs text-muted-foreground">{t.hint}</span>
            </button>
          ))}
        </div>

        {error ? (
          <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
            <Button variant="link" size="sm" className="ml-2 h-auto text-destructive" onClick={() => generate(tone)}>
              Retry
            </Button>
          </div>
        ) : generating ? (
          <div className="space-y-3" aria-busy="true" aria-label="Writing draft">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-44 w-full" />
          </div>
        ) : (
          <>
            <Field label="Subject">
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} />
            </Field>
            <Field label="Message">
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={9} maxLength={5000} />
            </Field>
          </>
        )}

        <button
          type="button"
          onClick={() => generate(tone)}
          disabled={generating}
          className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-primary hover:underline disabled:opacity-50"
        >
          <RefreshCw className={cn("size-3.5", generating && "animate-spin")} aria-hidden />
          Rewrite
        </button>
      </div>
    </Modal>
  );
}
