import { defineConfig } from "drizzle-kit";

// Server (Turso) migrations: full schema = shared + server-only tables.
// drizzle-kit reads schema/index.ts which re-exports both groups.
export default defineConfig({
  schema: "./src/lib/db/schema/index.ts",
  out: "./drizzle/server",
  dialect: "turso",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
});
