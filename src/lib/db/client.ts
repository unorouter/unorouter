import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";

let _db: LibSQLDatabase<typeof schema> | null = null;
let _client: Client | null = null;

export function getDb(): LibSQLDatabase<typeof schema> {
  if (_db) return _db;

  const url = process.env.TURSO_DATABASE_URL;
  if (!url) {
    throw new Error(
      "TURSO_DATABASE_URL is not set. Please configure Turso credentials.",
    );
  }

  _client = createClient({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  _db = drizzle(_client, { schema });
  return _db;
}
