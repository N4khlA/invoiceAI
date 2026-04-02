// src/__tests__/unit/invoice.service.test.ts
// Unit tests for invoice.service — all external deps mocked via setup.ts.

import {
  createInvoice,
  sendInvoice,
  markInvoicePaid,
  voidInvoice,
  getPublicInvoice,
} from "../../services/invoice.service";
import prisma from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { InvoiceStatus, Plan } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────────

const mockUser = {
  id: "user-1",
  email: "user@example.com",
  plan: Plan.PRO,
  invoicesThisMonth: 0,
  bizName: "Biz",
  bizAddress: null,
  bizPhone: null,
  bizWebsite: null,
  currency: "USD",
};

const mockClient = {
  id: "client-1",
  name: "ClientName",
  email: "client@example.com",
  address: null,
  phone: null,
  company: null,
};

/** Set up the $transaction mock to execute the callback with prisma as the tx argument */
function mockTransaction() {
  (prisma.$transaction as jest.Mock).mockImplementation(async (arg: unknown) => {
    if (typeof arg === "function") {
      // Callback transaction: prisma.$transaction(async (tx) => { ... })
      return (arg as (tx: typeof prisma) => Promise<unknown>)(prisma);
    }
    // Array transaction: prisma.$transaction([op1, op2])
    return Promise.all(arg as Promise<unknown>[]);
  });
}

// ─────────────────────────────────────────────────────────────────────────────

describe("Invoice Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default safe-fallback mocks
    (prisma.invoice.update as jest.Mock).mockResolvedValue({ id: "inv-1", status: "SENT", items: [] });
    (prisma.user.update as jest.Mock).mockResolvedValue({});
  });

  // ── createInvoice() ─────────────────────────────────────────────────────────

  describe("createInvoice()", () => {
    it("calculates totals server-side correctly", async () => {
      (prisma.user.findUniqueOrThrow as jest.Mock).mockResolvedValue(mockUser);
      (prisma.client.findFirst as jest.Mock).mockResolvedValue(mockClient);
      (prisma.invoice.count as jest.Mock).mockResolvedValue(0);
      mockTransaction();
      (prisma.invoice.create as jest.Mock).mockResolvedValue({ id: "inv-1", items: [] });

      await createInvoice({
        userId: "user-1",
        clientId: "client-1",
        dueDate: new Date(),
        lineItems: [
          { description: "Item 1", quantity: 2, unitPrice: 100, taxPct: 10 }, // 200 + 20 = 220
          { description: "Item 2", quantity: 1, unitPrice: 50, taxPct: 0 },   // 50 + 0  =  50
        ],
      });

      const createCall = (prisma.invoice.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.subtotal).toBe(250);
      expect(createCall.data.taxAmount).toBe(20);
      expect(createCall.data.total).toBe(270);
    });

    it("auto-generates invoice number in INV-NNNN format", async () => {
      (prisma.user.findUniqueOrThrow as jest.Mock).mockResolvedValue(mockUser);
      (prisma.client.findFirst as jest.Mock).mockResolvedValue(mockClient);
      (prisma.invoice.count as jest.Mock).mockResolvedValue(42); // existing = 42 → next = 43
      mockTransaction();
      (prisma.invoice.create as jest.Mock).mockResolvedValue({ id: "inv-1", items: [] });

      await createInvoice({
        userId: "user-1",
        clientId: "client-1",
        dueDate: new Date(),
        lineItems: [],
      });

      const createCall = (prisma.invoice.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.number).toBe("INV-0043");
    });

    it("stores snapshotData containing client and user business info", async () => {
      (prisma.user.findUniqueOrThrow as jest.Mock).mockResolvedValue(mockUser);
      (prisma.client.findFirst as jest.Mock).mockResolvedValue(mockClient);
      (prisma.invoice.count as jest.Mock).mockResolvedValue(0);
      mockTransaction();
      (prisma.invoice.create as jest.Mock).mockResolvedValue({ id: "inv-1", items: [] });

      await createInvoice({
        userId: "user-1",
        clientId: "client-1",
        dueDate: new Date(),
        lineItems: [],
      });

      const createCall = (prisma.invoice.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.snapshotData.client.name).toBe("ClientName");
      expect(createCall.data.snapshotData.business.name).toBe("Biz");
      expect(createCall.data.snapshotData.business.email).toBe("user@example.com");
    });

    it("throws 403 (plan limit) when Free user hits 5 invoice limit", async () => {
      (prisma.user.findUniqueOrThrow as jest.Mock).mockResolvedValue({
        ...mockUser,
        plan: Plan.FREE,
        invoicesThisMonth: 5,
      });

      await expect(
        createInvoice({
          userId: "user-1",
          clientId: "client-1",
          dueDate: new Date(),
          lineItems: [],
        })
      ).rejects.toMatchObject({ statusCode: 402 }); // AppError.planLimit → 402
    });

    it("throws 404 when clientId doesn't belong to this user", async () => {
      (prisma.user.findUniqueOrThrow as jest.Mock).mockResolvedValue(mockUser);
      (prisma.client.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        createInvoice({
          userId: "user-1",
          clientId: "other-client",
          dueDate: new Date(),
          lineItems: [],
        })
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  // ── sendInvoice() ───────────────────────────────────────────────────────────

  describe("sendInvoice()", () => {
    const draftInvoice = {
      id: "inv-1",
      status: InvoiceStatus.DRAFT,
      number: "INV-0001",
      total: 100,
      dueDate: new Date(),
      user: mockUser,
      client: mockClient,
      items: [],
    };

    it("sets status to SENT and generates a viewToken", async () => {
      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(draftInvoice);
      (prisma.invoice.update as jest.Mock).mockResolvedValue({
        ...draftInvoice,
        status: InvoiceStatus.SENT,
        viewToken: "some-uuid",
        items: [],
      });

      await sendInvoice("inv-1", "user-1");

      const updateCall = (prisma.invoice.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.data.status).toBe(InvoiceStatus.SENT);
      expect(updateCall.data.viewToken).toBeDefined();
    });

    it("calls the email service (Resend) with an email payload", async () => {
      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(draftInvoice);
      (prisma.invoice.update as jest.Mock).mockResolvedValue({
        ...draftInvoice,
        status: InvoiceStatus.SENT,
        items: [],
      });

      // Use the persistent __sendMock spy attached to the Resend constructor.
      // This survives jest.clearAllMocks() because it's a plain property on
      // the constructor function, not part of .mock.instances.
      const { Resend: ResendMock } = jest.requireMock<{
        Resend: jest.Mock & { __sendMock: jest.Mock };
      }>("resend");
      const sendSpy = ResendMock.__sendMock;

      await sendInvoice("inv-1", "user-1");

      expect(sendSpy).toHaveBeenCalled();
      const emailArg = sendSpy.mock.calls[0][0] as { to: string };
      expect(emailArg.to).toBe(mockClient.email);
    });

    it("throws 422 if invoice is not DRAFT", async () => {
      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue({
        ...draftInvoice,
        status: InvoiceStatus.SENT,
      });

      await expect(sendInvoice("inv-1", "user-1")).rejects.toMatchObject({
        statusCode: 422,
      });
    });
  });

  // ── markInvoicePaid() ────────────────────────────────────────────────────────

  describe("markPaid()", () => {
    it("sets status to PAID when invoice is SENT", async () => {
      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue({
        id: "inv-1",
        status: InvoiceStatus.SENT,
      });
      (prisma.invoice.update as jest.Mock).mockResolvedValue({
        id: "inv-1",
        status: InvoiceStatus.PAID,
        items: [],
      });

      await markInvoicePaid("inv-1", "user-1");

      const updateCall = (prisma.invoice.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.data.status).toBe(InvoiceStatus.PAID);
    });

    it("throws 422 if invoice is already PAID", async () => {
      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue({
        id: "inv-1",
        status: InvoiceStatus.PAID,
      });

      await expect(markInvoicePaid("inv-1", "user-1")).rejects.toMatchObject({
        statusCode: 422,
      });
    });

    it("throws 422 if invoice is VOID", async () => {
      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue({
        id: "inv-1",
        status: InvoiceStatus.VOID,
      });

      await expect(markInvoicePaid("inv-1", "user-1")).rejects.toMatchObject({
        statusCode: 422,
      });
    });
  });

  // ── voidInvoice() ────────────────────────────────────────────────────────────

  describe("voidInvoice()", () => {
    it("throws 422 if invoice is already PAID", async () => {
      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue({
        id: "inv-1",
        status: InvoiceStatus.PAID,
      });

      await expect(voidInvoice("inv-1", "user-1")).rejects.toMatchObject({
        statusCode: 422,
      });
    });

    it("throws 422 if invoice is already VOID", async () => {
      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue({
        id: "inv-1",
        status: InvoiceStatus.VOID,
      });

      await expect(voidInvoice("inv-1", "user-1")).rejects.toMatchObject({
        statusCode: 422,
      });
    });
  });

  // ── getPublicInvoice() (viewByToken) ─────────────────────────────────────────

  describe("viewByToken()", () => {
    const basePublicInvoice = {
      id: "inv-1",
      number: "INV-0001",
      status: InvoiceStatus.SENT,
      issueDate: new Date(),
      dueDate: new Date(),
      currency: "USD",
      subtotal: 100,
      taxAmount: 10,
      total: 110,
      notes: null,
      terms: null,
      snapshotData: {},
      items: [],
    };

    it("sets status to VIEWED on first view (status was SENT)", async () => {
      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue({
        ...basePublicInvoice,
        status: InvoiceStatus.SENT,
      });

      await getPublicInvoice("valid-token");

      const updateCall = (prisma.invoice.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.data.status).toBe(InvoiceStatus.VIEWED);
      expect(updateCall.data.viewedAt).toBeDefined();
    });

    it("does NOT update viewedAt if already VIEWED", async () => {
      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue({
        ...basePublicInvoice,
        status: InvoiceStatus.VIEWED,
      });

      await getPublicInvoice("valid-token");

      expect(prisma.invoice.update).not.toHaveBeenCalled();
    });

    it("throws 404 on invalid/unknown token", async () => {
      (prisma.invoice.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(getPublicInvoice("bad-token")).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });
});
