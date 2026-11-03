// src/services/ai.service.ts
// Generates follow-up emails via OpenAI GPT-4o.
// Without OPENAI_API_KEY (demo mode) a tone-aware template is returned instead.
// All inputs are validated and scoped to userId before reaching this layer.

import OpenAI from "openai";
import { InvoiceStatus, AiTone } from "@prisma/client";
import prisma from "../lib/prisma";
import { AppError } from "../lib/errors";
import { env, features } from "../config/env";
import { formatMoney } from "./email.service";

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  return _openai;
}

const ALLOWED_STATUSES: InvoiceStatus[] = [
  InvoiceStatus.SENT,
  InvoiceStatus.VIEWED,
  InvoiceStatus.OVERDUE,
];

function toneInstruction(tone: AiTone): string {
  switch (tone) {
    case AiTone.FRIENDLY:     return "friendly and warm";
    case AiTone.FORMAL:       return "formal and courteous";
    case AiTone.PROFESSIONAL:
    default:                  return "professional and concise";
  }
}

export interface FollowUpInput {
  userId:    string;
  invoiceId: string;
  tone?:     AiTone;
}

export interface FollowUpResult {
  subject: string;
  body:    string;
}

export async function generateFollowUp(input: FollowUpInput): Promise<FollowUpResult> {
  const { userId, invoiceId, tone } = input;

  // ── Fetch invoice (must belong to this user) ──────────────────────────────
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, userId },
    include: {
      client: { select: { name: true } },
      user:   { select: { bizName: true, aiTone: true } },
    },
  });

  if (!invoice) throw AppError.notFound("Invoice");

  // ── Status guard ──────────────────────────────────────────────────────────
  if (!ALLOWED_STATUSES.includes(invoice.status)) {
    throw AppError.badRequest(
      `Follow-up emails can only be sent for invoices with status: ${ALLOWED_STATUSES.join(", ")}. Current status: ${invoice.status}.`,
    );
  }

  // ── Build prompt context ───────────────────────────────────────────────────
  const effectiveTone = tone ?? invoice.user.aiTone;
  const businessName  = invoice.user.bizName ?? "Our Business";
  const clientName    = invoice.client.name;
  const invoiceNumber = invoice.number;
  const totalAmount   = invoice.total.toFixed(2);
  const currency      = invoice.currency;

  let overdueContext = "";
  if (invoice.status === InvoiceStatus.OVERDUE) {
    const daysOverdue = Math.max(0,
      Math.floor((Date.now() - invoice.dueDate.getTime()) / 86_400_000),
    );
    overdueContext = `This invoice is ${daysOverdue} day(s) overdue. `;
  }

  const userPrompt = `
Generate a follow-up email for an unpaid invoice.

Context:
- Business name: ${businessName}
- Client name: ${clientName}
- Invoice number: ${invoiceNumber}
- Invoice total: ${currency} ${totalAmount}
- Invoice status: ${invoice.status}
- ${overdueContext}
- Tone: ${toneInstruction(effectiveTone)}

Return ONLY a JSON object with keys "subject" (string) and "body" (string, plain text with line breaks).
Do not include any markdown, code fences, or extra text.
`.trim();

  if (!features.ai) {
    return templateFollowUp({
      tone: effectiveTone,
      businessName,
      clientName,
      invoiceNumber,
      amount: formatMoney(invoice.total, currency),
      overdueContext,
    });
  }

  // ── Call OpenAI ────────────────────────────────────────────────────────────
  let raw: string;
  try {
    const completion = await getOpenAI().chat.completions.create({
      model:      "gpt-4o",
      max_tokens: 500,
      messages: [
        {
          role:    "system",
          content: "You are a professional invoicing assistant. Generate follow-up emails. Return JSON only: { \"subject\": string, \"body\": string }",
        },
        { role: "user", content: userPrompt },
      ],
    });
    raw = completion.choices[0]?.message?.content ?? "";
  } catch (err) {
    console.error("[ai.service] OpenAI error:", err);
    throw AppError.serviceUnavailable("AI service is temporarily unavailable. Please try again later.", "AI_UNAVAILABLE");
  }

  // ── Parse response ─────────────────────────────────────────────────────────
  try {
    // Strip any accidental markdown code fences
    const cleaned = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const parsed = JSON.parse(cleaned) as { subject: string; body: string };

    if (typeof parsed.subject !== "string" || typeof parsed.body !== "string") {
      throw new Error("Missing subject or body in OpenAI response");
    }

    return { subject: parsed.subject, body: parsed.body };
  } catch {
    console.error("[ai.service] Failed to parse OpenAI response:", raw);
    throw AppError.serviceUnavailable("AI returned an invalid response. Please try again.", "AI_PARSE_ERROR");
  }
}

// ── Demo-mode fallback ────────────────────────────────────────────────────────

function templateFollowUp(ctx: {
  tone: AiTone;
  businessName: string;
  clientName: string;
  invoiceNumber: string;
  amount: string;
  overdueContext: string;
}): FollowUpResult {
  const { tone, businessName, clientName, invoiceNumber, amount, overdueContext } = ctx;
  const overdue = overdueContext.trim();

  switch (tone) {
    case AiTone.FRIENDLY:
      return {
        subject: `Quick reminder about invoice ${invoiceNumber}`,
        body:
          `Hi ${clientName},\n\n` +
          `Hope you're doing well! Just a friendly nudge about invoice ${invoiceNumber} for ${amount}. ` +
          `${overdue ? overdue + " " : ""}If it's already on its way, please ignore this.\n\n` +
          `Thanks so much,\n${businessName}`,
      };
    case AiTone.FORMAL:
      return {
        subject: `Payment reminder: invoice ${invoiceNumber}`,
        body:
          `Dear ${clientName},\n\n` +
          `We would like to remind you that invoice ${invoiceNumber}, totalling ${amount}, remains outstanding. ` +
          `${overdue ? overdue + " " : ""}We would be grateful if you could arrange payment at your earliest convenience.\n\n` +
          `Yours sincerely,\n${businessName}`,
      };
    case AiTone.PROFESSIONAL:
    default:
      return {
        subject: `Invoice ${invoiceNumber} — payment reminder`,
        body:
          `Hi ${clientName},\n\n` +
          `This is a reminder that invoice ${invoiceNumber} for ${amount} is awaiting payment. ` +
          `${overdue ? overdue + " " : ""}You can view and pay it using the link below.\n\n` +
          `Best regards,\n${businessName}`,
      };
  }
}

// ── Invoice notes & payment terms ─────────────────────────────────────────────

export type InvoiceTextKind = "notes" | "terms";

export interface InvoiceTextInput {
  userId:    string;
  kind:      InvoiceTextKind;
  clientId?: string;
  items?:    string[];   // line-item descriptions, for context
  dueDate?:  Date;
  tone?:     AiTone;
}

export async function generateInvoiceText(input: InvoiceTextInput): Promise<{ text: string }> {
  const { userId, kind, clientId, items = [], dueDate, tone } = input;

  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { bizName: true, aiTone: true },
  });
  if (!user) throw AppError.notFound("User");

  let clientName: string | undefined;
  if (clientId) {
    const client = await prisma.client.findFirst({ where: { id: clientId, userId }, select: { name: true } });
    if (!client) throw AppError.notFound("Client");
    clientName = client.name;
  }

  const effectiveTone = tone ?? user.aiTone;
  const businessName  = user.bizName ?? "our business";
  const work          = items.filter(Boolean).slice(0, 10);
  const due           = dueDate?.toLocaleDateString("en-US", { dateStyle: "long" });

  if (!features.ai) {
    return { text: templateInvoiceText({ kind, tone: effectiveTone, businessName, clientName, work, due }) };
  }

  const task = kind === "notes"
    ? "Write a short thank-you note (2-3 sentences) to print at the bottom of an invoice. Mention the work if it helps."
    : "Write concise payment terms (2-4 short lines) for an invoice: when payment is due, accepted method (bank transfer or card via the invoice link), and a polite late-payment line.";

  const userPrompt = `
${task}

Context:
- Business name: ${businessName}
- Client name: ${clientName ?? "the client"}
- Work billed: ${work.length ? work.join("; ") : "not specified"}
- Due date: ${due ?? "not specified"}
- Tone: ${toneInstruction(effectiveTone)}

Return ONLY the text itself — no greeting line, no signature, no markdown, no quotes.
`.trim();

  try {
    const completion = await getOpenAI().chat.completions.create({
      model:      "gpt-4o",
      max_tokens: 250,
      messages: [
        { role: "system", content: "You are a professional invoicing assistant. Reply with plain text only." },
        { role: "user",   content: userPrompt },
      ],
    });
    const text = completion.choices[0]?.message?.content?.trim() ?? "";
    if (!text) throw new Error("Empty completion");
    return { text: text.slice(0, 2000) };
  } catch (err) {
    console.error("[ai.service] OpenAI error:", err);
    throw AppError.serviceUnavailable("AI service is temporarily unavailable. Please try again later.", "AI_UNAVAILABLE");
  }
}

function templateInvoiceText(ctx: {
  kind: InvoiceTextKind;
  tone: AiTone;
  businessName: string;
  clientName?: string;
  work: string[];
  due?: string;
}): string {
  const { kind, tone, businessName, clientName, work, due } = ctx;
  const what = work.length ? work.slice(0, 2).join(" and ").toLowerCase() : "this project";
  const dueLine = due ? `Payment is due by ${due}.` : "Payment is due within 14 days of the issue date.";

  if (kind === "terms") {
    switch (tone) {
      case AiTone.FRIENDLY:
        return `${dueLine}\nYou can pay by bank transfer or by card straight from the invoice link.\nIf anything looks off, just reply and we'll sort it out together.`;
      case AiTone.FORMAL:
        return `${dueLine}\nPayment is accepted by bank transfer or by card via the secure invoice link.\nLate payments may incur a fee of 1.5% per month on the outstanding balance.`;
      case AiTone.PROFESSIONAL:
      default:
        return `${dueLine}\nPay by bank transfer or by card using the invoice link.\nPlease include the invoice number as your payment reference.`;
    }
  }

  const to = clientName ? `, ${clientName}` : "";
  switch (tone) {
    case AiTone.FRIENDLY:
      return `Thanks so much${to}! It was a pleasure working on ${what} with you — looking forward to the next one.`;
    case AiTone.FORMAL:
      return `Thank you for your business${to}. ${businessName} appreciates the opportunity to deliver ${what}.`;
    case AiTone.PROFESSIONAL:
    default:
      return `Thank you for your business${to}. It was great working with you on ${what}.`;
  }
}
