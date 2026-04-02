"use client";

import { FollowUp } from "@/types";
import { Mail, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/formatters";

function FollowUpItem({ item }: { item: FollowUp }) {
  const [open, setOpen] = useState(false);
  const date = new Date(item.sentAt).toLocaleDateString(undefined, {
    dateStyle: "medium",
  });
  const time = new Date(item.sentAt).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="rounded-lg border border-border bg-card/50 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-start justify-between w-full px-4 py-3 hover:bg-accent transition-colors text-left"
      >
        <div className="flex items-start gap-3 min-w-0">
          <Mail className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {item.subject}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {date} at {time}
            </p>
          </div>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        )}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-0 border-t border-border bg-muted/20">
          <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed mt-3">
            {item.body}
          </p>
        </div>
      )}
    </div>
  );
}

interface Props {
  followUps: FollowUp[];
  isLoading?: boolean;
}

export function FollowUpPanel({ followUps, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(2)].map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-border h-14 animate-pulse bg-muted/20"
          />
        ))}
      </div>
    );
  }

  if (followUps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Mail className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No follow-ups sent yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {followUps.map((fu) => (
        <FollowUpItem key={fu.id} item={fu} />
      ))}
    </div>
  );
}
