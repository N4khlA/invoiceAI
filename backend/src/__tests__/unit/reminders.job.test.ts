// src/__tests__/unit/reminders.job.test.ts

import { Prisma, InvoiceStatus } from "@prisma/client";
import { Resend } from "resend";
import prisma from "../../lib/prisma";
import { currentStage, sendDueReminders } from "../../jobs/reminders.job";

jest.mock("../../services/ai.service", () => ({
  generateFollowUp: jest.fn().mockResolvedValue({ subject: "Friendly reminder", body: "Please pay." }),
}));

const sendMock = (Resend as unknown as { __sendMock: jest.Mock }).__sendMock;
const DAY = 86_400_000;
const now = new Date("2026-06-15T09:00:00Z");

function invoice(overrides: Record<string, unknown> = {}) {
  return {
    id: "inv-1",
    userId: "user-1",
    number: "INV-0001",
    status: InvoiceStatus.SENT,
    viewToken: "tok-1",
    dueDate: now,                                  // due today
    sentAt: new Date(now.getTime() - 10 * DAY),
    client: { email: "client@acme.test" },
    followUps: [] as { reminderKey: string | null; sentAt: Date }[],
    ...overrides,
  };
}

describe("currentStage()", () => {
  const due = new Date("2026-06-15T00:00:00Z");
  const at = (days: number) => new Date(due.getTime() + days * DAY);

  it.each([
    [-5, null],
    [-3, "before-3"],
    [-1, "before-3"],
    [0, "due"],
    [6.9, "due"],
    [7, "after-7"],
    [30, "after-14"],
  ])("%d days from due → %s", (days, key) => {
    expect(currentStage(due, at(days))?.key ?? null).toBe(key);
  });
});

describe("sendDueReminders()", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sendMock.mockResolvedValue({ id: "email-1" });
    (prisma.followUp.create as jest.Mock).mockResolvedValue({ id: "fu-1" });
  });

  it("only looks at open invoices of PRO users with reminders on", async () => {
    (prisma.invoice.findMany as jest.Mock).mockResolvedValue([]);
    await sendDueReminders(now);
    const { where } = (prisma.invoice.findMany as jest.Mock).mock.calls[0][0];
    expect(where.user).toEqual({ plan: "PRO", autoReminders: true });
    expect(where.status.in).toEqual(["SENT", "VIEWED", "OVERDUE"]);
  });

  it("claims the stage, then emails the client", async () => {
    (prisma.invoice.findMany as jest.Mock).mockResolvedValue([invoice()]);

    expect(await sendDueReminders(now)).toBe(1);
    expect(prisma.followUp.create).toHaveBeenCalledWith({
      data: { invoiceId: "inv-1", method: "AUTO", reminderKey: "due", notes: "Friendly reminder" },
    });
    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({ to: "client@acme.test", subject: "Friendly reminder" }));
  });

  it("never repeats a stage", async () => {
    (prisma.invoice.findMany as jest.Mock).mockResolvedValue([
      invoice({ followUps: [{ reminderKey: "due", sentAt: new Date(now.getTime() - 2 * DAY) }] }),
    ]);
    expect(await sendDueReminders(now)).toBe(0);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("skips a stage whose moment passed before the invoice was sent", async () => {
    // Sent 2 days before due: the 3-days-before reminder would land right after the invoice
    (prisma.invoice.findMany as jest.Mock).mockResolvedValue([
      invoice({ dueDate: new Date(now.getTime() + 1 * DAY), sentAt: new Date(now.getTime() - 1 * DAY) }),
    ]);
    expect(await sendDueReminders(now)).toBe(0);
  });

  it("holds off when the client was nudged in the last 24h", async () => {
    (prisma.invoice.findMany as jest.Mock).mockResolvedValue([
      invoice({ followUps: [{ reminderKey: null, sentAt: new Date(now.getTime() - 3_600_000) }] }),
    ]);
    expect(await sendDueReminders(now)).toBe(0);
  });

  it("does nothing when another worker already claimed the stage", async () => {
    (prisma.invoice.findMany as jest.Mock).mockResolvedValue([invoice()]);
    (prisma.followUp.create as jest.Mock).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", { code: "P2002", clientVersion: "7" }),
    );

    expect(await sendDueReminders(now)).toBe(0);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("releases the claim when the email fails, so tomorrow retries", async () => {
    (prisma.invoice.findMany as jest.Mock).mockResolvedValue([invoice()]);
    sendMock.mockResolvedValue({ error: { message: "rate limited" } });

    expect(await sendDueReminders(now)).toBe(0);
    expect(prisma.followUp.delete).toHaveBeenCalledWith({ where: { id: "fu-1" } });
  });
});
