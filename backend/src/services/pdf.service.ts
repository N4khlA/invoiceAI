// src/services/pdf.service.ts
// Generates a professional PDF for an invoice using Puppeteer.
// All styling is inline CSS (no external files) for headless Chrome
// compatibility without network access.

import puppeteer from "puppeteer";
import { AppError } from "../lib/errors";

// ── Snapshot shape stored in Invoice.snapshotData ────────────────────────────
// invoice.service.ts writes: { client: {...}, business: {...} }

interface SnapshotClient {
  name?: string | null;
  email?: string | null;
  address?: string | null;
  phone?: string | null;
  company?: string | null;
}

interface SnapshotBusiness {
  name?: string | null;
  address?: string | null;
  phone?: string | null;
  website?: string | null;
  email?: string | null;
  currency?: string | null;
}

interface Snapshot {
  client?: SnapshotClient;
  business?: SnapshotBusiness;
}

// ── Optional live relations (populated when client+user are included) ─────────

interface LiveClient {
  name: string;
  email: string;
  address?: string | null;
  phone?: string | null;
  company?: string | null;
}

interface LiveUser {
  email: string;
  bizName?: string | null;
  bizAddress?: string | null;
  bizPhone?: string | null;
  bizWebsite?: string | null;
  currency?: string;
}

export interface PdfLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxPct: number;
  lineTotal: number;
  taxAmount: number;
  amount: number;
}

// ── Public input type ─────────────────────────────────────────────────────────
// Accepts the full Prisma result (include: { items, client, user })
// as well as a leaner snapshot-only object.

export interface PdfInvoiceInput {
  number: string;
  issueDate: Date;
  dueDate: Date;
  currency: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  notes?: string | null;
  terms?: string | null;
  snapshotData?: unknown;         // Prisma Json field — Snapshot at runtime
  items: PdfLineItem[];
  // Optional live relations — used when snapshotData is absent
  client?: LiveClient;
  user?: LiveUser;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function fmtDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

function esc(s?: string | null): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/\n/g, "<br>");
}

// ── Derive display data from snapshot + live relations ────────────────────────

function resolveDisplay(invoice: PdfInvoiceInput): {
  bizName: string;
  bizAddress: string | null;
  bizPhone: string | null;
  bizEmail: string | null;
  bizWebsite: string | null;
  clientName: string;
  clientEmail: string | null;
  clientAddress: string | null;
  clientCompany: string | null;
} {
  const snap = (invoice.snapshotData ?? {}) as Snapshot;
  const sb = snap.business ?? {};
  const sc = snap.client ?? {};
  const lr = invoice.client;
  const lu = invoice.user;

  return {
    bizName:      sb.name      ?? lu?.bizName    ?? "Your Business",
    bizAddress:   sb.address   ?? lu?.bizAddress  ?? null,
    bizPhone:     sb.phone     ?? lu?.bizPhone    ?? null,
    bizEmail:     sb.email     ?? lu?.email       ?? null,
    bizWebsite:   sb.website   ?? lu?.bizWebsite  ?? null,
    clientName:   sc.name      ?? lr?.name        ?? "Client",
    clientEmail:  sc.email     ?? lr?.email       ?? null,
    clientAddress: sc.address  ?? lr?.address     ?? null,
    clientCompany: sc.company  ?? lr?.company     ?? null,
  };
}

// ── HTML builder ──────────────────────────────────────────────────────────────

function buildHtml(invoice: PdfInvoiceInput): string {
  const d = resolveDisplay(invoice);
  const cur = invoice.currency || "USD";

  const itemRows = invoice.items
    .map(
      (it) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#111827">${esc(it.description)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right;color:#374151">${it.quantity.toLocaleString("en-US")}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right;color:#374151">${fmt(it.unitPrice, cur)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right;color:#374151">${it.taxPct > 0 ? it.taxPct + "%" : "\u2014"}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;color:#111827">${fmt(it.amount, cur)}</td>
      </tr>`,
    )
    .join("");

  const notesBlock = invoice.notes
    ? `<div style="margin-top:32px">
         <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280;margin:0 0 6px">Notes</p>
         <p style="font-size:13px;color:#374151;line-height:1.6;margin:0">${esc(invoice.notes)}</p>
       </div>`
    : "";

  const termsBlock = invoice.terms
    ? `<div style="margin-top:24px">
         <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280;margin:0 0 6px">Terms &amp; Conditions</p>
         <p style="font-size:13px;color:#374151;line-height:1.6;margin:0">${esc(invoice.terms)}</p>
       </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Invoice ${esc(invoice.number)}</title>
</head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;-webkit-print-color-adjust:exact;print-color-adjust:exact">

  <div style="max-width:760px;margin:0 auto;padding:48px 40px">

    <!-- Header -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:48px">
      <div>
        <h1 style="font-size:22px;font-weight:700;color:#111827;margin:0 0 4px">${esc(d.bizName)}</h1>
        ${d.bizAddress ? `<p style="font-size:13px;color:#6b7280;margin:0 0 2px;white-space:pre-wrap">${esc(d.bizAddress)}</p>` : ""}
        ${d.bizPhone   ? `<p style="font-size:13px;color:#6b7280;margin:0 0 2px">${esc(d.bizPhone)}</p>` : ""}
        ${d.bizEmail   ? `<p style="font-size:13px;color:#6b7280;margin:0 0 2px">${esc(d.bizEmail)}</p>` : ""}
        ${d.bizWebsite ? `<p style="font-size:13px;color:#6b7280;margin:0">${esc(d.bizWebsite)}</p>` : ""}
      </div>
      <div style="text-align:right">
        <p style="font-size:32px;font-weight:800;color:#4f46e5;margin:0 0 4px;letter-spacing:-0.5px">INVOICE</p>
        <p style="font-size:14px;color:#6b7280;margin:0">#${esc(invoice.number)}</p>
      </div>
    </div>

    <hr style="border:none;border-top:2px solid #e5e7eb;margin:0 0 36px">

    <!-- Addresses + dates -->
    <div style="display:flex;justify-content:space-between;margin-bottom:40px">
      <div>
        <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#6b7280;margin:0 0 8px">Bill To</p>
        <p style="font-size:14px;font-weight:600;color:#111827;margin:0 0 3px">${esc(d.clientName)}</p>
        ${d.clientCompany ? `<p style="font-size:13px;color:#374151;margin:0 0 3px">${esc(d.clientCompany)}</p>` : ""}
        ${d.clientEmail   ? `<p style="font-size:13px;color:#374151;margin:0 0 3px">${esc(d.clientEmail)}</p>` : ""}
        ${d.clientAddress ? `<p style="font-size:13px;color:#374151;margin:0;white-space:pre-wrap">${esc(d.clientAddress)}</p>` : ""}
      </div>
      <div style="text-align:right">
        <table style="border-collapse:collapse">
          <tr>
            <td style="padding:4px 16px 4px 0;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280">Issue Date</td>
            <td style="padding:4px 0;font-size:13px;color:#111827">${fmtDate(invoice.issueDate)}</td>
          </tr>
          <tr>
            <td style="padding:4px 16px 4px 0;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280">Due Date</td>
            <td style="padding:4px 0;font-size:13px;font-weight:600;color:#dc2626">${fmtDate(invoice.dueDate)}</td>
          </tr>
        </table>
      </div>
    </div>

    <!-- Line items table -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:32px">
      <thead>
        <tr style="background:#f9fafb">
          <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#6b7280;border-bottom:2px solid #e5e7eb">Description</th>
          <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#6b7280;border-bottom:2px solid #e5e7eb">Qty</th>
          <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#6b7280;border-bottom:2px solid #e5e7eb">Unit Price</th>
          <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#6b7280;border-bottom:2px solid #e5e7eb">Tax</th>
          <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#6b7280;border-bottom:2px solid #e5e7eb">Total</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>

    <!-- Totals -->
    <div style="display:flex;justify-content:flex-end;margin-bottom:40px">
      <table style="border-collapse:collapse;min-width:260px">
        <tr>
          <td style="padding:7px 16px 7px 0;font-size:13px;color:#6b7280">Subtotal</td>
          <td style="padding:7px 0;font-size:13px;text-align:right;color:#374151">${fmt(invoice.subtotal, cur)}</td>
        </tr>
        <tr>
          <td style="padding:7px 16px 7px 0;font-size:13px;color:#6b7280">Tax</td>
          <td style="padding:7px 0;font-size:13px;text-align:right;color:#374151">${fmt(invoice.taxAmount, cur)}</td>
        </tr>
        <tr><td colspan="2"><hr style="border:none;border-top:2px solid #e5e7eb;margin:4px 0"></td></tr>
        <tr>
          <td style="padding:10px 16px 10px 0;font-size:16px;font-weight:700;color:#111827">Amount Due</td>
          <td style="padding:10px 0;font-size:16px;font-weight:700;text-align:right;color:#4f46e5">${fmt(invoice.total, cur)}</td>
        </tr>
      </table>
    </div>

    ${notesBlock}
    ${termsBlock}

    <!-- Footer -->
    <div style="margin-top:56px;padding-top:20px;border-top:1px solid #e5e7eb;text-align:center">
      <p style="font-size:12px;color:#9ca3af;margin:0">Thank you for your business.</p>
    </div>

  </div>
</body>
</html>`;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate a PDF Buffer for the given invoice using Puppeteer (headless Chrome).
 * Accepts the full Prisma result with optional .client and .user relations,
 * as well as a plain invoice object with snapshotData.
 */
export async function generateInvoicePdf(invoice: PdfInvoiceInput): Promise<Buffer> {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(buildHtml(invoice), { waitUntil: "networkidle0" });

    const pdfUint8 = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });

    return Buffer.from(pdfUint8);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "PDF generation failed";
    throw AppError.internal(`Could not generate PDF: ${msg}`);
  } finally {
    if (browser) {
      await browser.close().catch(() => { /* best-effort */ });
    }
  }
}
