import { errMessage } from "@/lib/utils/base";
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

  if (!serverEnv.standalone) {
    const db = _db;
    migrate(db, { migrationsFolder: resolve("drizzle/server") })
      .catch((e) => {
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
  const msg = errMessage(e);
  return /already exists/i.test(msg);
}
