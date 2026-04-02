# InvoiceAI

InvoiceAI is a full-stack SaaS web application designed for freelancers and small agencies. It allows you to create and manage professional invoices, track their payment lifecycle status, send automated follow-up emails, and view financial dashboards.

## Features
- **Invoice Management**: Create, send, and track the status of invoices (Draft, Sent, Paid, Overdue, Void).
- **Client Address Book**: Easily manage your clients' information and link them to invoices.
- **Automated Follow-ups**: Stay on top of delayed payments with automated email follow-ups.
- **Financial Dashboard**: Get a comprehensive overview of your monthly usage, taxes, and income.
- **AI-Powered**: Generate invoice notes, terms, and follow-ups with Professional, Friendly, or Formal tones.

## Tech Stack
- **Frontend**: Next.js 14, React, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT & HttpOnly cookies
- **Integrations**: Stripe (Payments), Resend (Emails), OpenAI (AI Generation)

## Local Development Setup

### 1. Prerequisites
- [Node.js](https://nodejs.org/en/) (v18+)
- [Docker](https://www.docker.com/) (For PostgreSQL)

### 2. Run Database (Docker)
Start the PostgreSQL container:
```bash
docker run -d --name invoiceai-postgres -e POSTGRES_USER=invoiceai -e POSTGRES_PASSWORD=invoiceai -e POSTGRES_DB=invoiceai -p 5432:5432 postgres:16-alpine
```

### 3. Backend Setup
```bash
cd backend
npm install
# Ensure your .env contains DATABASE_URL=postgresql://invoiceai:invoiceai@localhost:5432/invoiceai
npx prisma db push --config prisma/config.ts
npx ts-node prisma/seed.ts
npm run dev
```
The backend server will run on `http://localhost:3001` (by default).

### 4. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
The frontend application will run on `http://localhost:3000`. You can test login with `demo@invoiceai.com` / `Demo1234!` after seeding the DB.

## License
MIT
