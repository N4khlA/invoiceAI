// src/services/email.service.ts
// Transactional email delivery via Resend SDK.

import { Resend } from "resend";
import { env } from "../config/env";
import { AppError } from "../lib/errors";

// Lazily initialised so tests can mock the env before import.
let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(env.RESEND_API_KEY);
  }
  return _resend;
}

// ── sendInvoiceEmail ──────────────────────────────────────────────────────────

/**
 * Send an invoice email with an attached PDF.
 *
 * @param to            Recipient email address.
 * @param subject       Email subject line.
 * @param htmlBody      Full HTML email body.
 * @param pdfBuffer     PDF bytes to attach.
 * @param invoiceNumber Invoice number used as the attachment filename.
 */
export async function sendInvoiceEmail(
  to: string,
  subject: string,
  htmlBody: string,
  pdfBuffer: Buffer,
  invoiceNumber: string,
): Promise<void> {
  const resend = getResend();

  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to,
    subject,
    html: htmlBody,
    attachments: [
      {
        filename: `invoice-${invoiceNumber}.pdf`,
        content: pdfBuffer,
      },
    ],
  });

  if (error) {
    throw AppError.internal(
      `Failed to send invoice email: ${error.message ?? "Unknown Resend error"}`,
    );
  }
}

// ── sendPasswordResetEmail ────────────────────────────────────────────────────

/**
 * Send a password-reset email with a magic link.
 *
 * @param to        Recipient email address.
 * @param resetLink Full URL the user should visit to reset their password.
 */
export async function sendPasswordResetEmail(
  to: string,
  resetLink: string,
): Promise<void> {
  const resend = getResend();

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <div style="max-width:560px;margin:48px auto;background:#ffffff;border-radius:12px;padding:40px;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
    <h2 style="font-size:22px;font-weight:700;color:#111827;margin:0 0 8px">Reset your password</h2>
    <p style="font-size:14px;color:#6b7280;line-height:1.6;margin:0 0 28px">
      We received a request to reset the password for your InvoiceAI account.
      Click the button below — this link expires in 1 hour.
    </p>
    <a href="${resetLink}"
       style="display:inline-block;background:#4f46e5;color:#ffffff;font-size:14px;font-weight:600;
              text-decoration:none;padding:12px 28px;border-radius:8px;letter-spacing:0.01em">
      Reset Password
    </a>
    <p style="font-size:12px;color:#9ca3af;margin:28px 0 0;line-height:1.5">
      If you did not request this, you can safely ignore this email.<br>
      For security, this link only works once and expires after 1 hour.
    </p>
  </div>
</body>
</html>`;

  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to,
    subject: "Reset your InvoiceAI password",
    html,
  });

  if (error) {
    throw AppError.internal(
      `Failed to send password-reset email: ${error.message ?? "Unknown Resend error"}`,
    );
  }
}
