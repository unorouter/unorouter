import { ParamError } from "@/lib/config/constants";
import { serverEnv } from "@/server/env";
import { logger } from "@/lib/utils/logger";
import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { resolve } from "path";
import * as schema from "../schema";
import { runSeeds } from "./seeds";

let _db: LibSQLDatabase<typeof schema> | null = null;
let _client: Client | null = null;

export function getDb(): LibSQLDatabase<typeof schema> {
  if (_db) return _db;

  if (!serverEnv.tursoUrl)
    throw new ParamError("ERRORS.MISSING_ENV", { var: "TURSO_DATABASE_URL" });

  _client = createClient({
    url: serverEnv.tursoUrl,
    authToken: serverEnv.tursoToken,
  });

  _db = drizzle(_client, { schema });

      // Migrations then seeds at startup, so seeds never race a schema change. Fire-and-forget: failures log, getDb stays usable.
  if (!serverEnv.standalone) {
    const db = _db;
    migrate(db, { migrationsFolder: resolve("drizzle/server") })
      .catch((e) => {
            // Baseline drift: tables exist but the ledger lacks the baseline, so 0000 re-runs and CREATE collides. Treat as migrated; re-throw anything else.
        if (isAlreadyExistsError(e)) {
          logger.warn("Migration baseline already applied; skipping", {
            context: "db",
          });
          return;
        }
        throw e;
      })
      .then(() => runSeeds(db))
      .catch((e) =>
        logger.error("Database migration / seed failed", {
          context: "db",
          err: e,
        }),
      );
  }

  return _db;
}

function isAlreadyExistsError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return /already exists/i.test(msg);
}
