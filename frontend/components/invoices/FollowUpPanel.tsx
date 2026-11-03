import { BellRing, Mail, MessageSquareText } from "lucide-react";
import type { FollowUp } from "@/types";
import { formatDateTime } from "@/lib/formatters";
import { Skeleton } from "@/components/ui";

const STAGE_LABELS: Record<string, string> = {
  "before-3": "3 days before due",
  due: "On the due date",
  "after-7": "7 days late",
  "after-14": "14 days late",
};

export function FollowUpPanel({ followUps, isLoading }: { followUps: FollowUp[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }
  if (followUps.length === 0) {
    return <p className="text-sm text-muted-foreground">No reminders sent yet.</p>;
  }
  return (
    <ul className="space-y-3">
      {followUps.map((f) => (
        <li key={f.id} className="flex gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground" aria-hidden>
            {f.method === "AUTO" ? <BellRing className="size-4" /> : f.method === "EMAIL" ? <Mail className="size-4" /> : <MessageSquareText className="size-4" />}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{f.notes || "Reminder"}</p>
            <p className="text-xs text-muted-foreground">
              {f.method === "AUTO" && (
                <>Automatic{f.reminderKey && STAGE_LABELS[f.reminderKey] ? ` · ${STAGE_LABELS[f.reminderKey]}` : ""} · </>
              )}
              {formatDateTime(f.sentAt)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
