# InvoiceAI

Invoicing for freelancers and small agencies: send professional invoices, let clients pay them by card, and let AI write — and send — the payment reminders.

Every integration is optional. With no API keys the whole app runs in **demo mode**: emails are logged to the console, AI uses tone-aware templates, billing upgrades instantly and "Pay now" opens a simulated checkout. Add keys one at a time to switch each piece to the real thing.

## Features

- **Invoices** — line items with per-line tax, 8 currencies, live totals, drafts, PDF export, duplicate, CSV export. Lifecycle: Draft → Sent → Viewed → Paid / Overdue / Void.
- **Client link + Pay now** — clients get a private, mobile-friendly page (no account). They pay by card through Stripe Checkout and the invoice marks itself paid via webhook; you get a "payment received" email.
- **Read receipts** — the invoice flips to *Viewed* when the client opens it (can be turned off).
- **Reminders** — draft a follow-up with AI in a Friendly, Professional or Formal tone, edit, send. On Pro, **automatic reminders** go out 3 days before the due date, on it, and 7 and 14 days late — each stage at most once, even across restarts or several servers.
- **AI writing** — "Write with AI" for invoice notes and payment terms (Pro).
- **Clients** — address book with totals invoiced, paid and outstanding.
- **Dashboard** — revenue this year, outstanding, overdue, six-month chart.
- **Plans** — Free (5 invoices/month) and Pro (unlimited, AI writing, automatic reminders) with Stripe subscriptions.
- **Branding** — upload your logo (PNG/JPEG/WebP ≤ 512 KB); it appears on the client page and the PDF.
- Light/dark theme, works from 375 px phones up, keyboard and screen-reader friendly.

## Tech stack

| | |
|---|---|
| Frontend | Next.js 14 (App Router), React 18, Tailwind CSS, Radix UI, react-hook-form + zod |
| Backend | Node.js, Express 5, TypeScript, zod |
| Database | PostgreSQL 16, Prisma 7 (with migrations) |
| Auth | JWT access token + rotating HttpOnly refresh cookie |
| Integrations | Stripe (subscriptions + Checkout), Resend (email), OpenAI (AI), Puppeteer (PDF) |
| Tests | Jest + supertest (backend), Playwright (end to end) |

## Run it locally

Prerequisite: Node.js 20+. No Docker needed.

```bash
# 1. Install
npm --prefix backend install
npm --prefix frontend install

# 2. Configure (the defaults work as-is for local dev; set a JWT_SECRET)
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

In `backend/.env` set `DATABASE_URL=postgresql://invoiceai:invoiceai@localhost:5432/invoiceai` and a `JWT_SECRET` of 32+ characters (`openssl rand -base64 32`).

```bash
# 3. Start Postgres (embedded, data in backend/.pgdata) — leave it running
npm run db:local

# 4. In a second terminal: create the tables and load demo data
npm run db:setup

# 5. Start the API (http://localhost:3001) and the app (http://localhost:3000)
npm run dev:backend
npm run dev:frontend
```

Log in with **demo@invoiceai.com / Demo1234!** (or click "Explore the demo account"). The demo user is on Pro, with clients and invoices in every status.

Prefer your own Postgres? Skip step 3 and point `DATABASE_URL` at it.

### With Docker

```bash
docker compose up --build
```

Starts Postgres, the API (runs migrations on boot) and the app on http://localhost:3000. Then seed once with `docker compose exec backend npx ts-node prisma/seed.ts`, or register a new account. Keys in `backend/.env` are picked up if the file exists.

### Already had a database from `prisma db push`?

The schema now lives in migrations. Mark the first one as applied, then apply the rest:

```bash
cd backend
npx prisma migrate resolve --applied 20261103081433_init --config prisma/config.ts
npm run db:migrate:prod
```

## Environment variables

Backend (`backend/.env`, see [`.env.example`](backend/.env.example)):

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `JWT_SECRET` | yes | 32+ random characters |
| `FRONTEND_URL` | yes | Public URL of the app (CORS, email links, Stripe redirects) |
| `RESEND_API_KEY`, `EMAIL_FROM` | no | Real email delivery (verified sender domain) |
| `OPENAI_API_KEY` | no | AI drafts (GPT-4o) instead of templates |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | no | Real "Pay now" checkout and webhooks |
| `STRIPE_PRO_PRICE_ID` | no | Monthly Pro price, for real subscriptions |
| `DEMO_PAYMENTS` | no | Simulated checkout without Stripe: on by default only for a localhost `FRONTEND_URL`; set `true` for a deployed public demo |

Frontend (`frontend/.env.local`): `NEXT_PUBLIC_API_URL`, e.g. `https://api.example.com/v1`.

`GET /health` reports which integrations are live (`features`).

## Stripe

1. Create a [sandbox](https://docs.stripe.com/sandboxes) and use its keys — a restricted key (`rk_…`) with write access to Checkout Sessions, Customers, Subscriptions and the Billing Portal is safer than a full secret key.
2. Create a Product with a monthly Price for Pro → `STRIPE_PRO_PRICE_ID`.
3. Add a webhook endpoint at `https://<api>/v1/billing/webhook` with these events:
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed` → `STRIPE_WEBHOOK_SECRET`.
   Locally: `stripe listen --forward-to localhost:3001/v1/billing/webhook`.

Invoices are only marked paid from the webhook (never from the success page), and only once even if Stripe retries.

**Limitation:** client payments currently land in the app owner's Stripe account. For a multi-tenant product each freelancer should be paid directly through [Stripe Connect](https://docs.stripe.com/connect) — that's the next step before charging real users.

## Deploy

A typical free-tier setup:

1. **Database — [Neon](https://neon.tech)** (or any Postgres 16): copy the pooled connection string.
2. **API — [Render](https://render.com)** web service from `backend/` using its Dockerfile (the image includes Chromium for PDFs and runs `prisma migrate deploy` on start). Set the backend env vars above; `FRONTEND_URL` is your Vercel URL. For a public demo without Stripe set `DEMO_PAYMENTS=true`.
3. **App — [Vercel](https://vercel.com)** project with root directory `frontend/`; set `NEXT_PUBLIC_API_URL=https://<render-url>/v1`.
4. Point the Stripe webhook at the Render URL and seed or register a user.

The refresh cookie is cross-site between the Vercel and Render domains; for production put both under one domain (e.g. `app.example.com` and `api.example.com`).

## Tests

```bash
npm test                          # backend unit + integration (Jest, no DB needed)
npm --prefix frontend run test:e2e  # Playwright: needs db:local, the API and the app running
```

## Project layout

```
backend/
  prisma/            schema, migrations, seed
  scripts/db-local   embedded Postgres for local dev
  src/
    routes/ controllers/ services/   REST API (/v1)
    jobs/            overdue flagging, automatic reminders, monthly usage reset
    lib/             prisma, stripe, mailer, jwt, plan gate
frontend/
  app/(app)/         signed-in app: dashboard, invoices, clients, billing, settings
  app/invoices/view/ public client page + demo checkout
  components/        UI kit and feature components
  e2e/               Playwright tests
design-system/       UI rules (generated with UI/UX Pro Max)
```

## License

MIT
