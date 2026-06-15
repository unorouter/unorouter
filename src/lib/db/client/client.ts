"use client";

import { GUEST_USER_ID, IS_DEV } from "@/lib/config/constants";
import { env } from "@/lib/config/env";
import * as client from "@/lib/db/schema/client";
import * as shared from "@/lib/db/schema/shared";
import type { LocalClient } from "@/lib/types";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import { LocalDbConnection, openMigratedSql } from "./connection";

    // Per-user OPFS file, lazy WASM import. Open/salvage/self-heal live in connection.ts; this file is the cache + LocalClient surface wiring.

let cached = new Map<number, Promise<LocalClient>>();

export async function getLocalDb(
  userId: number | undefined = GUEST_USER_ID,
): Promise<LocalClient | null> {
  if (typeof window === "undefined") return null;
  if (typeof indexedDB === "undefined") return null;
  const existing = cached.get(userId);
  if (existing) return existing;

  const promise = openClient(userId);
  cached.set(userId, promise);
  try {
    return await promise;
  } catch (err) {
    cached.delete(userId);
    throw err;
  }
}

    // Every statement path routes through conn.run so a lost OPFS handle heals transparently.
function buildLocalClient(conn: LocalDbConnection): LocalClient {
  const db = drizzle(
    (sql, params, method) => conn.run((s) => s.driver(sql, params, method)),
    (queries) => conn.run((s) => s.batchDriver(queries)),
    { schema: { ...shared, ...client } },
  );
  return {
    db,
    exec: (sql, params, method) => conn.run((s) => s.exec(sql, params, method)),
    transaction: (cb) => conn.run((s) => s.transaction(cb)),
    destroy: () => conn.current.destroy(),
    deleteDatabaseFile: () => conn.current.deleteDatabaseFile(),
    getDatabaseFile: () => conn.current.getDatabaseFile(),
    overwriteDatabaseFile: (file) => conn.current.overwriteDatabaseFile(file),
    reactiveQuery: (query) => conn.current.reactiveQuery(query),
  };
}

async function openClient(userId: number): Promise<LocalClient> {
  const dbPath = `${env.appName.toLowerCase()}-${userId}.sqlite3`;

  const sql = await openMigratedSql(dbPath, userId);
  const conn = new LocalDbConnection(sql, dbPath, userId);
  const wrapped = buildLocalClient(conn);

      // Release SAH on unload (Chromium orphan state); cache eviction before destroy for BFcache.
  if (typeof window !== "undefined") {
    const release = () => {
      cached.delete(userId);
      void wrapped.destroy().catch(() => {});
    };
    window.addEventListener("pagehide", release, { once: true });
    window.addEventListener("beforeunload", release, { once: true });
    // Dev-only globals; XSS exposes local DB.
    if (IS_DEV) {
      window.__local = wrapped;
      window.__shared = shared;
      window.__sqlocal = conn.current;
    }
  }
  return wrapped;
}

export function resetLocalDbCache() {
  cached = new Map();
}
