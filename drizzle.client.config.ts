import { defineConfig } from "drizzle-kit";

// Client (SQLocal/OPFS) migrations: shared tables (mirrored from server) plus
// client-only auxiliary tables. NEVER includes server-only tables (payment,
// moderation, catalogs). drizzle-kit emits plain SQLite DDL that SQLocal
// replays on first open in the browser.
export default defineConfig({
  schema: [
    "./src/lib/db/schema/shared.ts",
    "./src/lib/db/schema/client.ts",
  ],
  out: "./drizzle/client",
  dialect: "sqlite",
});
