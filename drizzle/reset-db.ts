import { createClient } from "@libsql/client";
import { error, log } from "console";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

try {
  const tables = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle%'",
  );

  for (const table of tables.rows) {
    await client.execute(`DROP TABLE IF EXISTS "${table.name}"`);
    log(`Dropped table: ${table.name}`);
  }

  log("Database reset successfully.");
} catch (err) {
  error("Error resetting database:", err);
} finally {
  client.close();
}
