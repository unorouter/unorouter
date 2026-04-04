import { createClient } from "@libsql/client";
import { error, log } from "console";
import { readdirSync, rmSync } from "fs";
import { resolve } from "path";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

try {
  // Drop all user tables
  const tables = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle%'",
  );

  for (const table of tables.rows) {
    await client.execute(`DROP TABLE IF EXISTS "${table.name}"`);
    log(`Dropped table: ${table.name}`);
  }

  // Drop drizzle migration tracking
  await client.execute("DROP TABLE IF EXISTS __drizzle_migrations");
  log("Dropped drizzle migration table");

  // Remove migration .sql files and meta folder
  const drizzleDir = resolve(import.meta.dirname, ".");
  for (const entry of readdirSync(drizzleDir)) {
    if (entry === "reset-db.ts") continue;
    rmSync(resolve(drizzleDir, entry), { recursive: true, force: true });
    log(`Removed: ${entry}`);
  }

  log("Database reset successfully.");
} catch (err) {
  error("Error resetting database:", err);
} finally {
  client.close();
}
