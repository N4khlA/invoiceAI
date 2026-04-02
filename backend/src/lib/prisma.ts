// src/lib/prisma.ts — Singleton PrismaClient (Prisma v7)
//
// Prisma v7 uses the "client" engine by default, which requires a database
// adapter instead of the old query-engine binary.
// We use @prisma/adapter-pg (the official PostgreSQL adapter).

import { PrismaClient } from "@prisma/client";
import { PrismaPg }     from "@prisma/adapter-pg";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["warn", "error"],
  });
}

export const prisma: PrismaClient =
  globalThis.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}

export default prisma;
