// prisma/config.ts — Prisma v7 configuration
// Connection URL goes here, NOT in schema.prisma (Prisma v7 requirement)
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "schema.prisma",
  migrations: {
    path: "migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
