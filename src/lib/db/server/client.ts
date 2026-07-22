import { errMessage } from "@/lib/utils/base";
import { ParamError } from "@/lib/config/constants";
import { serverEnv } from "@/server/env";
import { logger } from "@/lib/utils/logger";
import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { resolve } from "path";
import * as schema from "../schema";

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

  if (!serverEnv.standalone) {
    migrate(_db, { migrationsFolder: resolve("drizzle/server") })
      .catch((e) => {
        if (isAlreadyExistsError(e)) {
          logger.warn("Migration baseline already applied; skipping", {
            context: "db",
          });
          return;
        }
        // A write-blocked / read-only Turso (e.g. free-tier quota hit) rejects
        // the migrate with "BLOCKED: writes are forbidden". That is a transient
        // account state, not a code fault, so warn (one line) instead of
        // dumping the full DrizzleQueryError stack on every boot.
        if (isWriteBlockedError(e)) {
          logger.warn(
            "Migration skipped: database is read-only / write-blocked",
            {
              context: "db",
            },
          );
          return;
        }
        throw e;
      })
      .catch((e) =>
        logger.error("Database migration failed", { context: "db", err: e }),
      );
  }

  return _db;
}

function isAlreadyExistsError(e: unknown): boolean {
  return /already exists/i.test(errMessage(e));
}

function isWriteBlockedError(e: unknown): boolean {
  return /blocked|forbidden|read.?only|quota/i.test(errMessage(e));
}
