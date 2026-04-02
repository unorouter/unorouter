import { serverEnv } from "@/server/env";
import { createClient, type Client } from "@libsql/client";
import { error } from "console";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { resolve } from "path";
import * as schema from "./schema";

let _db: LibSQLDatabase<typeof schema> | null = null;
let _client: Client | null = null;

export function getDb(): LibSQLDatabase<typeof schema> {
  if (_db) return _db;

  _client = createClient({
    url: serverEnv.tursoUrl,
    authToken: serverEnv.tursoToken,
  });

  _db = drizzle(_client, { schema });

  // Run migrations at startup (skip during build)
  if (!process.env.STANDALONE) {
    migrate(_db, { migrationsFolder: resolve("drizzle") }).catch((e) =>
      error("Database migration failed", e),
    );
  }

  return _db;
}
