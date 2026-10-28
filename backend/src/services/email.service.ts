// src/services/email.service.ts
// HTML templates for transactional email. Delivery goes through lib/mailer.

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function layout(title: string, inner: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:${FONT}">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:40px">
    ${inner}
  </div>
  <p style="text-align:center;font-size:12px;color:#94a3b8;margin:0 0 40px">Sent with InvoiceAI</p>
</body>
</html>`;
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#4f46e5;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:8px">${escapeHtml(label)}</a>`;
}

export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function invoiceEmailHtml(opts: {
  number: string;
  bizName: string;
  clientName: string;
  total: number;
  currency: string;
  dueDate: Date;
  viewUrl: string;
}): string {
  const due = opts.dueDate.toLocaleDateString("en-US", { dateStyle: "long" });
  return layout(
    `Invoice ${opts.number}`,
    `<p style="font-size:13px;color:#64748b;margin:0 0 4px">Invoice ${escapeHtml(opts.number)}</p>
    <h1 style="font-size:28px;font-weight:700;color:#0f172a;margin:0 0 24px">${formatMoney(opts.total, opts.currency)}</h1>
    <p style="font-size:15px;color:#334155;line-height:1.6;margin:0 0 8px">Hi ${escapeHtml(opts.clientName)},</p>
    <p style="font-size:15px;color:#334155;line-height:1.6;margin:0 0 28px">
      <strong>${escapeHtml(opts.bizName)}</strong> sent you an invoice due on <strong>${due}</strong>.
    </p>
    ${button(opts.viewUrl, "View invoice")}
    <p style="font-size:12px;color:#94a3b8;margin:28px 0 0;line-height:1.5">
      Button not working? Paste this link into your browser:<br>${opts.viewUrl}
    </p>`,
  );
}

export function followUpEmailHtml(opts: { body: string; viewUrl: string }): string {
  const paragraphs = escapeHtml(opts.body)
    .split(/\n{2,}/)
    .map((p) => `<p style="font-size:15px;color:#334155;line-height:1.6;margin:0 0 16px">${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
  return layout("Invoice reminder", `${paragraphs}<div style="margin-top:12px">${button(opts.viewUrl, "View invoice")}</div>`);
}

export function passwordResetEmailHtml(resetLink: string): string {
  return layout(
    "Reset your password",
    `<h2 style="font-size:22px;font-weight:700;color:#0f172a;margin:0 0 8px">Reset your password</h2>
    <p style="font-size:14px;color:#64748b;line-height:1.6;margin:0 0 28px">
      We received a request to reset the password for your InvoiceAI account.
      This link expires in 15 minutes.
    </p>
    ${button(resetLink, "Reset password")}
    <p style="font-size:12px;color:#94a3b8;margin:28px 0 0;line-height:1.5">
      If you did not request this, you can safely ignore this email.
    </p>`,
  );
}
