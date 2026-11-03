import Link from "next/link";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/formatters";

/** Inline nudge shown where a PRO-only feature would be. */
export function UpgradePrompt({ feature, className }: { feature: string; className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4 text-sm sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <p className="flex items-start gap-2 text-foreground">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        <span>
          <span className="font-semibold">{feature}</span> is included with Pro.
        </span>
      </p>
      <Link
        href="/billing"
        className="inline-flex h-9 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors duration-150 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        Upgrade to Pro
      </Link>
    </div>
  );
}
