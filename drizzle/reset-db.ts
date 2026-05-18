import { deleteR2Prefix } from "@/lib/config/r2";
import { createClient } from "@libsql/client";
import { execSync } from "child_process";
import { error, log } from "console";
import { readdirSync, rmSync } from "fs";
import { resolve } from "path";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

try {
  // Wipe every R2 prefix the app writes to so orphaned uploads don't linger
  // after a DB reset. Add new prefixes here when introducing new media types.
  const r2Prefixes = ["chat/", "playgrounds/", "playgrounds-refs/"];
  for (const prefix of r2Prefixes) {
    try {
      await deleteR2Prefix(prefix);
      log(`Wiped R2 "${prefix}" prefix`);
    } catch (err) {
      error(`R2 wipe failed for "${prefix}" (continuing with DB reset):`, err);
    }
  }

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

  log("Server Turso reset successfully.");
  log(
    "Note: client SQLocal/OPFS data is NOT reset by this script. Clear browser site data manually if needed.",
  );

  // Regenerate server + client migration files. Server output goes to
  // drizzle/server/ (Turso), client to drizzle/client/ (SQLocal). The client
  // migrations are bundled into src/lib/db/client/migrations.json at build time.
  log("Running db:generate (server + client)...");
  execSync("bun run db:generate", {
    cwd: resolve(import.meta.dirname, ".."),
    stdio: "inherit",
  });
} catch (err) {
  error("Error resetting database:", err);
} finally {
  client.close();
}
