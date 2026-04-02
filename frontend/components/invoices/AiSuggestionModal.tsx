"use client";

import { AiFollowUpSuggestion, AiTone } from "@/types";
import { useEffect, useRef, useState } from "react";
import { Sparkles, X, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/formatters";

const TONES: { value: AiTone; label: string }[] = [
  { value: "FORMAL", label: "Formal" },
  { value: "FRIENDLY", label: "Friendly" },
  { value: "FIRM", label: "Firm" },
];

interface Props {
  open: boolean;
  suggestion: AiFollowUpSuggestion | null;
  isGenerating: boolean;
  isSending: boolean;
  tone: AiTone;
  onToneChange: (t: AiTone) => void;
  onRegenerate: () => void;
  onSend: (subject: string, body: string) => void;
  onClose: () => void;
}

export function AiSuggestionModal({
  open,
  suggestion,
  isGenerating,
  isSending,
  tone,
  onToneChange,
  onRegenerate,
  onSend,
  onClose,
}: Props) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  // Sync fields whenever suggestion updates
  useEffect(() => {
    if (suggestion) {
      setSubject(suggestion.subject);
      setBody(suggestion.body);
    }
  }, [suggestion]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const handleSend = () => {
    if (!subject.trim() || !body.trim()) return;
    onSend(subject, body);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="ai-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-xl rounded-xl border border-border bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 id="ai-modal-title" className="text-base font-semibold text-foreground">
              AI Follow-Up Suggestion
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-accent transition-colors text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tone selector */}
        <div className="px-5 pt-4 shrink-0">
          <p className="text-xs text-muted-foreground mb-2">Tone</p>
          <div className="flex gap-2">
            {TONES.map((t) => (
              <button
                key={t.value}
                onClick={() => onToneChange(t.value)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                  tone === t.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:border-primary/50"
                )}
              >
                {t.label}
              </button>
            ))}
            <button
              onClick={onRegenerate}
              disabled={isGenerating}
              className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border border-border bg-card text-muted-foreground hover:border-primary/50 disabled:opacity-50 transition-colors"
            >
              {isGenerating ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              Regenerate
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4 flex flex-col gap-3 overflow-y-auto flex-1">
          {isGenerating ? (
            <div className="space-y-3">
              <div className="h-9 rounded-lg bg-muted/30 animate-pulse" />
              <div className="h-40 rounded-lg bg-muted/30 animate-pulse" />
            </div>
          ) : suggestion ? (
            <>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Subject
                </label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">
                  Message
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={10}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none leading-relaxed"
                />
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center py-10">
              <p className="text-sm text-muted-foreground">
                No suggestion generated yet.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-border shrink-0">
          <button
            onClick={onClose}
            disabled={isSending}
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={isSending || isGenerating || !suggestion}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-indigo-500 transition-colors disabled:opacity-50"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {isSending ? "Sending…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
