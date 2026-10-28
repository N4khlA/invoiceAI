// src/lib/mailer.ts — single entry point for outgoing email.
// Without RESEND_API_KEY (demo mode) messages are logged instead of sent.

import { Resend } from "resend";
import { env, features } from "../config/env";
import { AppError } from "./errors";

export interface MailAttachment {
  filename: string;
  content: Buffer;
}

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  attachments?: MailAttachment[];
}

// Lazily initialised so tests can mock the env before import.
let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) _resend = new Resend(env.RESEND_API_KEY);
  return _resend;
}

export async function sendMail(message: MailMessage): Promise<{ delivered: boolean }> {
  if (!features.email) {
    console.log(`[mail:demo] to=${message.to} subject="${message.subject}" (not sent — no RESEND_API_KEY)`);
    return { delivered: false };
  }

  const result = await getResend().emails.send({ from: env.EMAIL_FROM, ...message });
  if (result?.error) {
    throw AppError.internal(`Failed to send email: ${result.error.message ?? "Unknown Resend error"}`);
  }
  return { delivered: true };
}
