// src/jobs/reminders.job.ts — Automatic payment reminders (PRO)
//
// Every morning, open invoices of PRO users with autoReminders on get one
// email per stage: 3 days before the due date, on it, then 7 and 14 days
// late. Each stage is claimed with a unique (invoiceId, reminderKey) row
// before anything else, so restarts or several workers never double-send
// (or pay for the same AI draft twice).

import cron from "node-cron";
import { InvoiceStatus, Plan, Prisma } from "@prisma/client";
import prisma from "../lib/prisma";
import { env } from "../config/env";
import { sendMail } from "../lib/mailer";
import { generateFollowUp } from "../services/ai.service";
import { followUpEmailHtml } from "../services/email.service";

const DAY = 86_400_000;

export const REMINDER_STAGES = [
  { key: "before-3", offsetDays: -3 },
  { key: "due",      offsetDays: 0 },
  { key: "after-7",  offsetDays: 7 },
  { key: "after-14", offsetDays: 14 },
] as const;

const LAST_STAGE = REMINDER_STAGES[REMINDER_STAGES.length - 1].key;
const BATCH_SIZE = 200;

/** The latest stage whose moment has passed, or null if none is due yet. */
export function currentStage(dueDate: Date, now: Date) {
  const daysFromDue = (now.getTime() - dueDate.getTime()) / DAY;
  let stage: (typeof REMINDER_STAGES)[number] | null = null;
  for (const s of REMINDER_STAGES) if (daysFromDue >= s.offsetDays) stage = s;
  return stage;
}

function fetchBatch(now: Date, cursor?: string) {
  return prisma.invoice.findMany({
    where: {
      status:  { in: [InvoiceStatus.SENT, InvoiceStatus.VIEWED, InvoiceStatus.OVERDUE] },
      sentAt:  { not: null },
      dueDate: { lte: new Date(now.getTime() + 3 * DAY) },
      user:    { plan: Plan.PRO, autoReminders: true },
      // Fully reminded invoices would otherwise sit in every batch forever
      followUps: { none: { reminderKey: LAST_STAGE } },
    },
    include: {
      client:    { select: { email: true } },
      followUps: { select: { reminderKey: true, sentAt: true } },
    },
    orderBy: { id: "asc" },
    take: BATCH_SIZE,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
}

type Candidate = Awaited<ReturnType<typeof fetchBatch>>[number];

async function remind(invoice: Candidate, now: Date): Promise<boolean> {
  const stage = currentStage(invoice.dueDate, now);
  if (!stage) return false;
  if (invoice.followUps.some((f) => f.reminderKey === stage.key)) return false;

  // Invoice went out after this stage's moment (e.g. sent on the due date):
  // wait for the next stage instead of reminding straight away
  const stageAt = invoice.dueDate.getTime() + stage.offsetDays * DAY;
  if (invoice.sentAt && invoice.sentAt.getTime() > stageAt) return false;

  // Someone nudged this client in the last 24h — don't pile on
  if (invoice.followUps.some((f) => now.getTime() - f.sentAt.getTime() < DAY)) return false;

  let claim;
  try {
    claim = await prisma.followUp.create({
      data: { invoiceId: invoice.id, method: "AUTO", reminderKey: stage.key, notes: "Automatic reminder" },
    });
  } catch (err) {
    // Another worker claimed this stage first
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return false;
    throw err;
  }

  try {
    const { subject, body } = await generateFollowUp({ userId: invoice.userId, invoiceId: invoice.id });
    await sendMail({
      to: invoice.client.email,
      subject,
      html: followUpEmailHtml({ body, viewUrl: `${env.FRONTEND_URL}/invoices/view/${invoice.viewToken}` }),
    });
    await prisma.followUp.update({ where: { id: claim.id }, data: { notes: subject, sentAt: new Date() } });
    return true;
  } catch (err) {
    // Release the claim so tomorrow's run retries
    await prisma.followUp.delete({ where: { id: claim.id } });
    throw err;
  }
}

export async function sendDueReminders(now = new Date()): Promise<number> {
  let sent = 0;
  let cursor: string | undefined;

  for (;;) {
    const batch = await fetchBatch(now, cursor);
    for (const invoice of batch) {
      try {
        if (await remind(invoice, now)) sent++;
      } catch (err) {
        console.error(`[reminders-job] Invoice ${invoice.number} failed:`, err);
      }
    }
    if (batch.length < BATCH_SIZE) break;
    cursor = batch[batch.length - 1].id;
  }

  if (sent > 0) console.log(`[reminders-job] Sent ${sent} reminder(s)`);
  return sent;
}

export function startRemindersJob(): void {
  // Catch up on start so a server that was down at 09:00 doesn't skip a day
  void sendDueReminders().catch((err) => console.error("[reminders-job] Error:", err));
  cron.schedule("0 9 * * *", () => {
    void sendDueReminders().catch((err) => console.error("[reminders-job] Error:", err));
  });

  console.log("[reminders-job] Scheduled (runs daily at 09:00)");
}
