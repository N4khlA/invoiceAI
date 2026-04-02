// src/__tests__/setup.ts
// Global test setup: mocks for Prisma, Resend, OpenAI, Stripe, and env vars.

// ── Environment Variables (must be set BEFORE any module imports) ─────────────
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/testdb";
process.env.JWT_SECRET = "test-jwt-secret-at-least-32-chars-long!";
process.env.REFRESH_TOKEN_EXPIRY_DAYS = "7";
process.env.RESEND_API_KEY = "re_test_key";
process.env.EMAIL_FROM = "noreply@invoiceai.test";
process.env.FRONTEND_URL = "http://localhost:3000";
process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_dummy";
process.env.STRIPE_PRO_PRICE_ID = "price_test_pro";
process.env.OPENAI_API_KEY = "sk-test-openai-key";
process.env.PORT = "4001";

// ── Mock: Prisma ──────────────────────────────────────────────────────────────
// jest.mock is hoisted to the top — this mock replaces the singleton prisma client
jest.mock("../lib/prisma", () => {
  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    refreshToken: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    client: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    invoice: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    followUp: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  // Support both named and default export
  return { __esModule: true, default: mockPrisma, prisma: mockPrisma };
});

// ── Mock: Resend ──────────────────────────────────────────────────────────────
// The `send` spy is attached directly on the Resend constructor so tests can
// always reach it via `(Resend as any).__sendMock` — even after clearAllMocks()
// resets mock.instances (custom properties are NOT reset by clearAllMocks).
jest.mock("resend", () => {
  const sendMock = jest.fn().mockResolvedValue({ id: "email-mock-id" });
  const ResendMock = jest.fn().mockImplementation(() => ({
    emails: { send: sendMock },
  }));
  // Expose shared spy so tests can assert on it without using mock.instances
  (ResendMock as jest.Mock & { __sendMock: jest.Mock }).__sendMock = sendMock;
  return { Resend: ResendMock };
});

// ── Mock: OpenAI ──────────────────────────────────────────────────────────────
// ts-jest with esModuleInterop compiles `import OpenAI from 'openai'` to
// `const openai_1 = require('openai'); new openai_1.default(...)` — so
// the constructor must live at the `.default` property.
jest.mock("openai", () => {
  const MockOpenAI = jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: "Mocked AI response" } }],
        }),
      },
    },
  }));
  // Expose as both the module default and the named export
  return { __esModule: true, default: MockOpenAI, OpenAI: MockOpenAI };
});

// ── Mock: Stripe ──────────────────────────────────────────────────────────────
jest.mock("stripe", () => {
  return jest.fn().mockImplementation(() => ({
    customers: { create: jest.fn() },
    subscriptions: { create: jest.fn(), cancel: jest.fn() },
    webhooks: { constructEvent: jest.fn() },
    checkout: { sessions: { create: jest.fn() } },
    billingPortal: { sessions: { create: jest.fn() } },
  }));
});

// ── Mock: pdf.service ─────────────────────────────────────────────────────────
jest.mock("../services/pdf.service", () => ({
  generateInvoicePdf: jest.fn().mockResolvedValue(Buffer.from("fake-pdf")),
}));

// ── Silence console output in tests ──────────────────────────────────────────
global.console = {
  ...console,
  // Suppress non-error output during tests (comment out to debug)
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  // Keep error visible
  error: console.error,
};
