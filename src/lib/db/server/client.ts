import { ParamError } from "@/lib/config/constants";
import { serverEnv } from "@/server/env";
import { createClient, type Client } from "@libsql/client";
import { error } from "console";
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

  // Run migrations + seeds at startup (skip during build). Seeds are awaited
  // sequentially after migrate so they never race against an in-flight
  // schema change. Both fire-and-forget; failures log but don't block the
  // first request — getDb still returns a usable client.
  if (!serverEnv.standalone) {
    const db = _db;
    migrate(db, { migrationsFolder: resolve("drizzle/server") })
      .then(() => runSeeds(db))
      .catch((e) => error("Database migration / seed failed", e));
  }

  return _db;
}
