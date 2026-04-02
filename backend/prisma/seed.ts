// prisma/seed.ts
// Demo seed: 1 user, 3 clients, 5 invoices (all statuses), 2 follow-ups.
// Run with: npx ts-node prisma/seed.ts

import { PrismaClient, InvoiceStatus, Plan, AiTone } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  // ── Clean slate ──────────────────────────────────────────────────────────
  await prisma.followUp.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.client.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  // ── Demo User ────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("Demo1234!", 12);

  const user = await prisma.user.create({
    data: {
      email: "demo@invoiceai.com",
      password: passwordHash,
      name: "Alex Demo",
      bizName: "Acme Freelance",
      bizAddress: "123 Main St, San Francisco, CA 94102",
      bizPhone: "+1 (555) 000-1234",
      bizWebsite: "https://acmefreelance.com",
      currency: "USD",
      plan: Plan.PRO,
      aiTone: AiTone.PROFESSIONAL,
      readReceipts: true,
    },
  });
  console.log(`  ✓ User created: ${user.email}`);

  // ── Clients ──────────────────────────────────────────────────────────────
  const [clientA, clientB, clientC] = await Promise.all([
    prisma.client.create({
      data: {
        userId: user.id,
        name: "Beacon Digital",
        email: "accounts@beacondigital.co",
        company: "Beacon Digital Ltd",
        address: "45 Tech Park, Austin, TX 78701",
        phone: "+1 (512) 555-0100",
      },
    }),
    prisma.client.create({
      data: {
        userId: user.id,
        name: "Nova Startup",
        email: "billing@novastartup.io",
        company: "Nova Startup Inc.",
        address: "88 Innovation Drive, New York, NY 10001",
        phone: "+1 (212) 555-0200",
      },
    }),
    prisma.client.create({
      data: {
        userId: user.id,
        name: "Sarah Chen",
        email: "sarah.chen@personal.com",
        address: "77 Oak Avenue, Seattle, WA 98101",
      },
    }),
  ]);
  console.log(`  ✓ 3 clients created`);

  const snapshot = (client: typeof clientA) => ({
    client: {
      name: client.name,
      email: client.email,
      address: client.address ?? null,
      phone: client.phone ?? null,
      company: client.company ?? null,
    },
    business: {
      name: user.bizName,
      address: user.bizAddress,
      phone: user.bizPhone,
      website: user.bizWebsite,
      email: user.email,
      currency: user.currency,
    },
  });

  // ── Invoice 1 — DRAFT ────────────────────────────────────────────────────
  await prisma.invoice.create({
    data: {
      userId: user.id,
      clientId: clientA.id,
      number: "INV-0001",
      status: InvoiceStatus.DRAFT,
      dueDate: new Date(Date.now() + 30 * 86400000),
      subtotal: 4500,
      taxAmount: 900,
      total: 5400,
      notes: "Payment due within 30 days.",
      snapshotData: snapshot(clientA),
      items: {
        create: [
          { description: "Brand Strategy Consulting", quantity: 15, unitPrice: 200, taxPct: 20, lineTotal: 3000, taxAmount: 600, amount: 3600 },
          { description: "Logo Design Package", quantity: 1, unitPrice: 1500, taxPct: 20, lineTotal: 1500, taxAmount: 300, amount: 1800 },
        ],
      },
    },
  });

  // ── Invoice 2 — SENT ─────────────────────────────────────────────────────
  await prisma.invoice.create({
    data: {
      userId: user.id,
      clientId: clientB.id,
      number: "INV-0002",
      status: InvoiceStatus.SENT,
      dueDate: new Date(Date.now() + 14 * 86400000),
      sentAt: new Date(Date.now() - 3 * 86400000),
      subtotal: 2800,
      taxAmount: 0,
      total: 2800,
      terms: "Wire transfer to account on file. Reference INV-0002.",
      snapshotData: snapshot(clientB),
      items: {
        create: [
          { description: "MVP Development — Sprint 1", quantity: 40, unitPrice: 70, taxPct: 0, lineTotal: 2800, taxAmount: 0, amount: 2800 },
        ],
      },
    },
  });

  // ── Invoice 3 — PAID ─────────────────────────────────────────────────────
  await prisma.invoice.create({
    data: {
      userId: user.id,
      clientId: clientA.id,
      number: "INV-0003",
      status: InvoiceStatus.PAID,
      dueDate: new Date(Date.now() - 10 * 86400000),
      sentAt: new Date(Date.now() - 25 * 86400000),
      paidAt: new Date(Date.now() - 5 * 86400000),
      subtotal: 1200,
      taxAmount: 240,
      total: 1440,
      snapshotData: snapshot(clientA),
      items: {
        create: [
          { description: "Website Audit Report", quantity: 1, unitPrice: 1200, taxPct: 20, lineTotal: 1200, taxAmount: 240, amount: 1440 },
        ],
      },
    },
  });

  // ── Invoice 4 — OVERDUE (with follow-ups) ────────────────────────────────
  const overdueInvoice = await prisma.invoice.create({
    data: {
      userId: user.id,
      clientId: clientC.id,
      number: "INV-0004",
      status: InvoiceStatus.OVERDUE,
      dueDate: new Date(Date.now() - 21 * 86400000),
      sentAt: new Date(Date.now() - 35 * 86400000),
      subtotal: 950,
      taxAmount: 0,
      total: 950,
      notes: "Please settle at your earliest convenience.",
      snapshotData: snapshot(clientC),
      items: {
        create: [
          { description: "UX Research & Wireframes", quantity: 1, unitPrice: 950, taxPct: 0, lineTotal: 950, taxAmount: 0, amount: 950 },
        ],
      },
    },
  });

  // Follow-ups on the overdue invoice
  await prisma.followUp.createMany({
    data: [
      {
        invoiceId: overdueInvoice.id,
        sentAt: new Date(Date.now() - 14 * 86400000),
        method: "EMAIL",
        notes: "Friendly first reminder sent.",
      },
      {
        invoiceId: overdueInvoice.id,
        sentAt: new Date(Date.now() - 7 * 86400000),
        method: "EMAIL",
        notes: "Second reminder — urgent.",
      },
    ],
  });

  // ── Invoice 5 — VOID ─────────────────────────────────────────────────────
  await prisma.invoice.create({
    data: {
      userId: user.id,
      clientId: clientB.id,
      number: "INV-0005",
      status: InvoiceStatus.VOID,
      dueDate: new Date(Date.now() - 5 * 86400000),
      voidedAt: new Date(Date.now() - 2 * 86400000),
      subtotal: 600,
      taxAmount: 0,
      total: 600,
      notes: "Voided — project cancelled by client.",
      snapshotData: snapshot(clientB),
      items: {
        create: [
          { description: "Social Media Kit", quantity: 1, unitPrice: 600, taxPct: 0, lineTotal: 600, taxAmount: 0, amount: 600 },
        ],
      },
    },
  });

  // Set invoicesThisMonth counter to match seeded data
  await prisma.user.update({
    where: { id: user.id },
    data: { invoicesThisMonth: 2 }, // DRAFT + SENT this month
  });

  console.log(`  ✓ 5 invoices created (DRAFT, SENT, PAID, OVERDUE, VOID)`);
  console.log(`  ✓ 2 follow-ups created on overdue invoice`);
  console.log("\n🎉 Seed complete!");
  console.log("   Login: demo@invoiceai.com / Demo1234!");
}

main()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
