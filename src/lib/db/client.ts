import { serverEnv } from "@/server/env";
import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
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
  return _db;
}
