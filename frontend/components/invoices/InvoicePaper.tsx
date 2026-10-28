import type { InvoiceStatus, LineItem } from "@/types";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { cn } from "@/lib/formatters";

export interface PaperParty {
  name?: string | null;
  email?: string | null;
  address?: string | null;
  phone?: string | null;
  website?: string | null;
  company?: string | null;
}

interface InvoicePaperProps {
  number: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  currency: string;
  items: LineItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  notes?: string | null;
  terms?: string | null;
  business: PaperParty;
  client: PaperParty;
  logoUrl?: string | null;
  className?: string;
}

function Party({ label, party }: { label: string; party: PaperParty }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1.5 font-semibold text-slate-900">{party.name || "—"}</p>
      {party.company && party.company !== party.name && <p className="text-slate-600">{party.company}</p>}
      {party.address && <p className="whitespace-pre-line text-slate-600">{party.address}</p>}
      {party.email && <p className="break-all text-slate-600">{party.email}</p>}
      {party.phone && <p className="text-slate-600">{party.phone}</p>}
      {party.website && <p className="break-all text-slate-600">{party.website.replace(/^https?:\/\//, "")}</p>}
    </div>
  );
}

/** The invoice as the client sees it. Always light, like paper. */
export function InvoicePaper(props: InvoicePaperProps) {
  const { number, status, issueDate, dueDate, currency, items, subtotal, taxAmount, total, notes, terms, business, client, logoUrl, className } = props;
  const money = (v: number) => formatCurrency(v, currency);

  return (
    <article className={cn("invoice-paper relative overflow-hidden text-sm", className)} aria-label={`Invoice ${number}`}>
      {status === "PAID" && (
        <div className="pointer-events-none absolute right-6 top-6 rotate-6 rounded-md border-2 border-emerald-500 px-3 py-1 font-display text-sm font-bold uppercase tracking-widest text-emerald-600 sm:right-10 sm:top-10">
          Paid
        </div>
      )}
      {status === "VOID" && (
        <div className="pointer-events-none absolute right-6 top-6 rotate-6 rounded-md border-2 border-slate-400 px-3 py-1 font-display text-sm font-bold uppercase tracking-widest text-slate-500 sm:right-10 sm:top-10">
          Void
        </div>
      )}

      <div className="p-6 sm:p-10">
        <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={`${business.name ?? "Business"} logo`} className="mb-3 h-10 w-auto max-w-[160px] object-contain" />
            ) : (
              <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-indigo-600 font-display text-lg font-bold text-white" aria-hidden>
                {(business.name ?? "?")[0]}
              </div>
            )}
            <p className="font-display text-lg font-bold text-slate-900">{business.name}</p>
          </div>
          <div className="sm:text-right">
            <p className="font-display text-3xl font-bold tracking-tight text-slate-900">Invoice</p>
            <p className="mt-1 font-mono text-sm text-slate-500">{number}</p>
          </div>
        </header>

        <div className="mt-8 grid grid-cols-1 gap-6 border-y border-slate-200 py-6 sm:grid-cols-3">
          <Party label="From" party={business} />
          <Party label="Bill to" party={client} />
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-1 sm:text-right">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Issued</dt>
              <dd className="mt-1 font-medium text-slate-900">{formatDate(issueDate)}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Due</dt>
              <dd className="mt-1 font-medium text-slate-900">{formatDate(dueDate)}</dd>
            </div>
          </dl>
        </div>

        {/* Items: table ≥ sm, stacked below */}
        <table className="mt-6 hidden w-full sm:table">
          <thead>
            <tr className="border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              <th scope="col" className="pb-3 font-semibold">Description</th>
              <th scope="col" className="pb-3 text-right font-semibold">Qty</th>
              <th scope="col" className="pb-3 text-right font-semibold">Rate</th>
              <th scope="col" className="pb-3 text-right font-semibold">Tax</th>
              <th scope="col" className="pb-3 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody className="tabular divide-y divide-slate-100">
            {items.map((item, i) => (
              <tr key={item.id ?? i}>
                <td className="py-3 pr-4 text-slate-900">{item.description}</td>
                <td className="py-3 text-right text-slate-600">{item.quantity}</td>
                <td className="py-3 text-right text-slate-600">{money(item.unitPrice)}</td>
                <td className="py-3 text-right text-slate-600">{item.taxPct ? `${item.taxPct}%` : "—"}</td>
                <td className="py-3 text-right font-medium text-slate-900">{money(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <ul className="mt-6 divide-y divide-slate-100 sm:hidden">
          {items.map((item, i) => (
            <li key={item.id ?? i} className="tabular flex justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="text-slate-900">{item.description}</p>
                <p className="text-xs text-slate-500">
                  {item.quantity} × {money(item.unitPrice)}
                  {item.taxPct ? ` + ${item.taxPct}% tax` : ""}
                </p>
              </div>
              <p className="shrink-0 font-medium text-slate-900">{money(item.amount)}</p>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex justify-end border-t border-slate-200 pt-5">
          <dl className="tabular w-full max-w-xs space-y-2">
            <div className="flex justify-between text-slate-600">
              <dt>Subtotal</dt>
              <dd>{money(subtotal)}</dd>
            </div>
            <div className="flex justify-between text-slate-600">
              <dt>Tax</dt>
              <dd>{money(taxAmount)}</dd>
            </div>
            <div className="flex items-baseline justify-between border-t border-slate-200 pt-3">
              <dt className="font-semibold text-slate-900">Total due</dt>
              <dd className="font-display text-2xl font-bold text-slate-900">{money(total)}</dd>
            </div>
          </dl>
        </div>

        {(notes || terms) && (
          <div className="mt-8 grid grid-cols-1 gap-6 border-t border-slate-200 pt-6 sm:grid-cols-2">
            {notes && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Notes</p>
                <p className="mt-1.5 whitespace-pre-line leading-relaxed text-slate-700">{notes}</p>
              </div>
            )}
            {terms && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Payment terms</p>
                <p className="mt-1.5 whitespace-pre-line leading-relaxed text-slate-700">{terms}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
