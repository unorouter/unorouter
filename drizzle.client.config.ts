import { defineConfig } from "drizzle-kit";

// Client (SQLocal/OPFS) migrations: the chat tables, the model-tester tables and
// the client-only auxiliary tables. NEVER includes server-only tables (payment,
// moderation, catalogs). drizzle-kit emits plain SQLite DDL that SQLocal replays
// on first open in the browser.
//
// tester.ts must be listed EXPLICITLY. It holds the only tables the server also
// owns, so it lives outside shared.ts to keep chat tables out of the server's
// config; leaving it out here makes drizzle emit a DROP for the user's local
// test history.
export default defineConfig({
  schema: [
    "./src/lib/db/schema/shared.ts",
    "./src/lib/db/schema/tester.ts",
    "./src/lib/db/schema/client.ts",
  ],
  out: "./drizzle/client",
  dialect: "sqlite",
});
