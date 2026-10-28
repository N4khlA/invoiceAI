import Link from "next/link";
import { Check } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ThemeSwitch } from "@/components/ui";

const POINTS = [
  "Professional invoices and PDFs in under a minute",
  "Know the moment a client opens your invoice",
  "Polite, AI-written payment reminders",
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between px-4 sm:px-8">
          <Link href="/" className="rounded-lg" aria-label="InvoiceAI home">
            <Logo />
          </Link>
          <ThemeSwitch />
        </header>
        <main className="flex flex-1 items-center justify-center px-4 pb-16 pt-4 sm:px-8">
          <div className="w-full max-w-[400px] animate-fade-in">{children}</div>
        </main>
      </div>

      <aside className="relative hidden w-[46%] max-w-[720px] overflow-hidden bg-slate-950 lg:block" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_70%_20%,rgba(99,102,241,0.45),transparent),radial-gradient(50%_40%_at_20%_90%,rgba(16,185,129,0.18),transparent)]" />
        <div className="relative flex h-full flex-col justify-center px-14 py-16">
          <p className="font-display text-sm font-semibold uppercase tracking-[0.16em] text-indigo-300">Invoicing for freelancers</p>
          <h2 className="mt-4 max-w-md font-display text-4xl font-bold leading-[1.1] text-white">
            Send it once. Get paid without chasing.
          </h2>
          <ul className="mt-8 space-y-3">
            {POINTS.map((p) => (
              <li key={p} className="flex items-center gap-3 text-[15px] text-slate-300">
                <span className="flex size-6 items-center justify-center rounded-full bg-white/10">
                  <Check className="size-3.5 text-emerald-300" />
                </span>
                {p}
              </li>
            ))}
          </ul>

          {/* Mini invoice card */}
          <div className="mt-12 max-w-sm rounded-2xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-xs text-slate-400">INV-0042</p>
                <p className="mt-1 text-sm font-medium text-white">Beacon Digital</p>
              </div>
              <span className="rounded-full bg-emerald-400/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">Paid</span>
            </div>
            <div className="mt-5 space-y-2">
              <div className="h-2 w-4/5 rounded bg-white/10" />
              <div className="h-2 w-3/5 rounded bg-white/10" />
            </div>
            <div className="mt-5 flex items-end justify-between border-t border-white/10 pt-4">
              <p className="text-xs text-slate-400">Paid 2 days after sending</p>
              <p className="font-display text-2xl font-bold tabular-nums text-white">$5,400.00</p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
