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
