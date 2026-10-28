import { Bell, Check, Eye, Sparkles } from "lucide-react";

/** Static product mockup for the hero — built from real UI pieces, no screenshot. */
export function HeroPreview() {
  const rows = [
    { n: "INV-0042", c: "Beacon Digital", s: "Paid", amt: "$5,400.00", tone: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30" },
    { n: "INV-0043", c: "Nova Startup", s: "Viewed", amt: "$2,800.00", tone: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/30" },
    { n: "INV-0044", c: "Sarah Chen", s: "Overdue", amt: "$950.00", tone: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30" },
    { n: "INV-0045", c: "Atlas Coffee Co.", s: "Sent", amt: "$1,250.00", tone: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30" },
  ];
  const bars = [38, 52, 44, 70, 62, 88];

  return (
    <div className="relative mx-auto w-full max-w-5xl" aria-hidden>
      <div className="absolute -inset-x-8 -top-10 bottom-0 -z-10 bg-[radial-gradient(50%_60%_at_50%_30%,hsl(var(--primary)/0.22),transparent)]" />
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_30px_80px_-30px_rgb(15_23_42/0.35)]">
        <div className="flex items-center gap-1.5 border-b border-border bg-muted/50 px-4 py-2.5">
          <span className="size-2.5 rounded-full bg-red-400/80" />
          <span className="size-2.5 rounded-full bg-amber-400/80" />
          <span className="size-2.5 rounded-full bg-emerald-400/80" />
          <span className="ml-3 hidden rounded-md bg-background px-3 py-0.5 font-mono text-[11px] text-muted-foreground sm:block">invoiceai.app/dashboard</span>
        </div>
        <div className="grid gap-4 p-4 sm:p-6 md:grid-cols-[1fr_260px]">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                ["Revenue", "$48,250"],
                ["Outstanding", "$5,000"],
                ["Overdue", "1"],
              ].map(([l, v]) => (
                <div key={l} className="rounded-xl border border-border p-3">
                  <p className="text-[11px] text-muted-foreground">{l}</p>
                  <p className="tabular mt-1 font-display text-base font-bold text-foreground sm:text-lg">{v}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-border">
              {rows.map((r) => (
                <div key={r.n} className="flex items-center gap-3 border-b border-border px-3 py-2.5 text-xs last:border-0 sm:text-sm">
                  <span className="hidden font-mono text-muted-foreground sm:inline">{r.n}</span>
                  <span className="min-w-0 flex-1 truncate font-medium text-foreground">{r.c}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${r.tone}`}>{r.s}</span>
                  <span className="tabular w-20 text-right font-semibold text-foreground">{r.amt}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="hidden space-y-4 md:block">
            <div className="rounded-xl border border-border p-4">
              <p className="text-xs font-medium text-muted-foreground">Collected</p>
              <div className="mt-3 flex h-24 items-end gap-2">
                {bars.map((h, i) => (
                  <div key={i} className="flex-1 rounded-t bg-primary" style={{ height: `${h}%`, opacity: i === bars.length - 1 ? 1 : 0.55 }} />
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-primary/30 bg-accent p-4">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-accent-foreground">
                <Sparkles className="size-3.5" /> Reminder drafted
              </p>
              <p className="mt-2 text-xs leading-relaxed text-foreground/80">
                “Hi Sarah, hope you&apos;re well! Just a friendly nudge about invoice INV-0044…”
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Floating chips */}
      <div className="absolute -left-2 top-1/3 hidden items-center gap-2 rounded-xl border border-border bg-card/90 px-3 py-2 text-xs font-medium text-foreground shadow-pop backdrop-blur lg:flex">
        <span className="flex size-6 items-center justify-center rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-300"><Eye className="size-3.5" /></span>
        Nova Startup opened INV-0043
      </div>
      <div className="absolute -right-2 bottom-10 hidden items-center gap-2 rounded-xl border border-border bg-card/90 px-3 py-2 text-xs font-medium text-foreground shadow-pop backdrop-blur lg:flex">
        <span className="flex size-6 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"><Check className="size-3.5" /></span>
        $5,400.00 received
        <Bell className="ml-1 size-3.5 text-muted-foreground" />
      </div>
    </div>
  );
}
