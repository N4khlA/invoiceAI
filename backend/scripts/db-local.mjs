// scripts/db-local.mjs — Local PostgreSQL without Docker
//
// Runs a real Postgres 16 from the `embedded-postgres` npm package, with the
// same credentials as docker-compose.yml, so DATABASE_URL in .env.example works:
//   postgresql://invoiceai:invoiceai@localhost:5432/invoiceai
// Data lives in backend/.pgdata (gitignored). Ctrl+C stops the server.
//
// Usage: npm run db:local   (PG_PORT=5433 npm run db:local to change the port)

import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const dataDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.pgdata");
const port = Number(process.env.PG_PORT ?? 5432);
const fresh = !existsSync(path.join(dataDir, "PG_VERSION"));

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: "invoiceai",
  password: "invoiceai",
  port,
  persistent: true,
  onLog: () => {},
});

if (fresh) await pg.initialise();
await pg.start();
if (fresh) await pg.createDatabase("invoiceai");

console.log(`🐘  Postgres running → postgresql://invoiceai:invoiceai@localhost:${port}/invoiceai`);
if (fresh) console.log("    New cluster: run `npm run db:migrate:prod && npm run db:seed` next.");

async function shutdown() {
  await pg.stop();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
