import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BellRing,
  Check,
  Eye,
  FileText,
  Link2,
  Moon,
  Send,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/Button";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { HeroPreview } from "@/components/marketing/HeroPreview";

const FEATURES = [
  {
    icon: FileText,
    title: "Invoices in a minute",
    text: "Line items, per-line tax, any of 8 currencies and live totals. Save a draft or send right away.",
  },
  {
    icon: Eye,
    title: "Know when it's opened",
    text: "Clients get a clean, mobile-friendly link. The moment they open it, the invoice flips to Viewed.",
  },
  {
    icon: Sparkles,
    title: "Reminders that sound like you",
    text: "Pick friendly, professional or formal. AI drafts the follow-up, you tweak it and hit send.",
  },
  {
    icon: BellRing,
    title: "Overdue, automatically",
    text: "Unpaid invoices past their due date are flagged every night, so nothing slips through.",
  },
  {
    icon: BarChart3,
    title: "See where money stands",
    text: "Revenue this year, what's outstanding, what's late and six months of collections at a glance.",
  },
  {
    icon: Moon,
    title: "Light, dark, and your phone",
    text: "Designed for a 13\" laptop and a 6\" phone alike, with a proper dark mode.",
  },
];

const STEPS = [
  { icon: UserPlus, title: "Add your client", text: "Name and email are enough. Save company, address and notes if you like." },
  { icon: Send, title: "Send the invoice", text: "They get an email with a secure link and a PDF. You see when they open it." },
  { icon: Check, title: "Get paid", text: "Send a reminder in one click if it's late, then mark it paid. Done." },
];

const FAQ = [
  {
    q: "Is it really free?",
    a: "Yes. The Free plan includes 5 invoices a month, unlimited clients, AI reminders and client links. Upgrade to Pro only when you need more invoices.",
  },
  {
    q: "Do my clients need an account?",
    a: "No. They open a private link to view, print or save the invoice as a PDF — nothing to sign up for.",
  },
  {
    q: "Who writes the reminder emails?",
    a: "InvoiceAI drafts them with AI in the tone you choose, using the invoice details. You always review and edit before anything is sent.",
  },
  {
    q: "Can I try it without signing up?",
    a: "Yes — open the demo account. It's pre-filled with clients and invoices in every status so you can click through everything.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-dvh bg-background">
      <MarketingNav />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_bottom,transparent,hsl(var(--background))),radial-gradient(hsl(var(--border))_1px,transparent_1px)] bg-[size:100%_100%,22px_22px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />
          <div className="mx-auto max-w-6xl px-4 pb-16 pt-14 text-center sm:px-6 sm:pt-20 lg:pb-24">
            <p className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
              <Sparkles className="size-3.5 text-primary" aria-hidden />
              AI-written payment reminders
            </p>
            <h1 className="mx-auto mt-6 max-w-3xl text-balance font-display text-[40px] font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-6xl">
              Send the invoice. <span className="text-primary">Skip the chasing.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              InvoiceAI is invoicing for freelancers: professional invoices in a minute, read receipts when clients open them, and
              polite follow-ups written for you.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/register">
                  Start free
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                <Link href="/login?demo=1">
                  <Sparkles className="text-primary" aria-hidden />
                  Explore the live demo
                </Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">Free forever for 5 invoices a month · no card required</p>

            <div className="mt-14 sm:mt-16">
              <HeroPreview />
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-20 border-t border-border bg-card/40 py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">Features</p>
              <h2 className="mt-3 text-3xl font-bold text-foreground sm:text-4xl">Everything between “done” and “paid”</h2>
              <p className="mt-4 text-muted-foreground">No accounting suite to learn. Just the parts of invoicing freelancers actually do every week.</p>
            </div>
            <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-2xl border border-border bg-card p-6 shadow-card">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold text-foreground">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-20 py-20 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">How it works</p>
              <h2 className="mt-3 text-3xl font-bold text-foreground sm:text-4xl">Three steps. That&apos;s the whole thing.</h2>
            </div>
            <ol className="mt-14 grid gap-8 md:grid-cols-3">
              {STEPS.map(({ icon: Icon, title, text }, i) => (
                <li key={title} className="relative text-center md:text-left">
                  {i < STEPS.length - 1 && <span className="absolute left-[calc(50%+40px)] top-6 hidden h-px w-[calc(100%-48px)] bg-border md:left-16 md:block" aria-hidden />}
                  <span className="relative mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25 md:mx-0">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Step {i + 1}</p>
                  <h3 className="mt-1 text-lg font-semibold text-foreground">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
                </li>
              ))}
            </ol>

            <div className="mt-16 grid items-center gap-8 rounded-3xl border border-border bg-card p-6 shadow-card sm:p-10 lg:grid-cols-2">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  <Link2 className="size-3.5" aria-hidden />
                  Client view
                </span>
                <h3 className="mt-4 text-2xl font-bold text-foreground">Your client gets a link, not a login</h3>
                <p className="mt-3 leading-relaxed text-muted-foreground">
                  A clean, printable invoice that works on any phone. It shows how much is due and when, and opening it is your read
                  receipt.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm" aria-hidden>
                <div className="flex items-center gap-2 rounded-lg bg-indigo-50 p-3 text-sm text-indigo-950">
                  <BellRing className="size-4" />
                  <span className="font-semibold">$2,800.00 due in 9 days</span>
                </div>
                <div className="mt-4 flex items-start justify-between">
                  <div>
                    <p className="font-display font-bold">Acme Freelance</p>
                    <p className="text-xs text-slate-500">Bill to: Nova Startup</p>
                  </div>
                  <p className="font-mono text-xs text-slate-500">INV-0002</p>
                </div>
                <div className="mt-4 space-y-2 border-y border-slate-100 py-3 text-sm">
                  <div className="flex justify-between"><span>MVP development — sprint 1</span><span className="tabular">$2,800.00</span></div>
                </div>
                <div className="mt-3 flex justify-between text-sm font-semibold"><span>Total due</span><span className="tabular">$2,800.00</span></div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="scroll-mt-20 border-t border-border bg-card/40 py-20 sm:py-24">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <div className="text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">Pricing</p>
              <h2 className="mt-3 text-3xl font-bold text-foreground sm:text-4xl">Simple, honest pricing</h2>
              <p className="mt-4 text-muted-foreground">Start free. Upgrade when you&apos;re sending more than five a month.</p>
            </div>
            <div className="mt-12 grid gap-4 md:grid-cols-2">
              {[
                { name: "Free", price: "$0", cta: "Start free", features: ["5 invoices / month", "Unlimited clients", "AI-written reminders", "Client links & read receipts", "PDF export"], featured: false },
                { name: "Pro", price: "$12", cta: "Start with Pro", features: ["Unlimited invoices", "Everything in Free", "Cancel anytime"], featured: true },
              ].map((p) => (
                <div key={p.name} className={`relative flex flex-col rounded-2xl border bg-card p-7 shadow-card ${p.featured ? "border-primary/50 ring-1 ring-primary/20" : "border-border"}`}>
                  {p.featured && <span className="absolute right-6 top-6 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">Most popular</span>}
                  <h3 className="text-lg font-bold text-foreground">{p.name}</h3>
                  <p className="mt-4">
                    <span className="tabular font-display text-5xl font-bold text-foreground">{p.price}</span>
                    <span className="text-muted-foreground"> / month</span>
                  </p>
                  <ul className="mt-7 flex-1 space-y-3">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-center gap-2.5 text-sm text-foreground">
                        <Check className="size-4 shrink-0 text-success" aria-hidden />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button asChild size="lg" variant={p.featured ? "primary" : "outline"} className="mt-8 w-full">
                    <Link href="/register">{p.cta}</Link>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20 py-20 sm:py-24">
          <div className="mx-auto max-w-3xl px-4 sm:px-6">
            <h2 className="text-center text-3xl font-bold text-foreground sm:text-4xl">Questions</h2>
            <div className="mt-10 divide-y divide-border rounded-2xl border border-border bg-card">
              {FAQ.map(({ q, a }) => (
                <details key={q} className="group px-5 py-1 sm:px-6">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-semibold text-foreground [&::-webkit-details-marker]:hidden">
                    {q}
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-transform group-open:rotate-45" aria-hidden>
                      +
                    </span>
                  </summary>
                  <p className="pb-5 text-sm leading-relaxed text-muted-foreground">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-4 pb-20 sm:px-6">
          <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl bg-slate-950 px-6 py-14 text-center sm:px-12 sm:py-16">
            <div className="absolute inset-0 bg-[radial-gradient(60%_80%_at_50%_0%,rgba(99,102,241,0.5),transparent)]" aria-hidden />
            <div className="relative">
              <h2 className="text-3xl font-bold text-white sm:text-4xl">Your next invoice could already be sent.</h2>
              <p className="mx-auto mt-4 max-w-lg text-slate-300">Create a free account in 30 seconds, or poke around the demo first.</p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button asChild size="lg" className="w-full bg-white text-slate-950 hover:bg-white/90 sm:w-auto">
                  <Link href="/register">
                    Start free
                    <ArrowRight aria-hidden />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="ghost" className="w-full text-white hover:bg-white/10 hover:text-white sm:w-auto">
                  <Link href="/login?demo=1">Open the demo</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <Logo />
          <p>© {new Date().getFullYear()} InvoiceAI · Built for freelancers</p>
        </div>
      </footer>
    </div>
  );
}
