"use client";

import { GUEST_USER_ID, IS_DEV } from "@/lib/config/constants";
import { env } from "@/lib/config/env";
import * as client from "@/lib/db/schema/client";
import * as shared from "@/lib/db/schema/shared";
import type { LocalClient } from "@/lib/types";
import { logger } from "@/lib/utils/logger";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import type { SQLocalDrizzle } from "sqlocal/drizzle";
import { LOCAL_ONLY_TABLES } from "@/lib/db/schema/client";
import { copyAllTables } from "./data-migrate/copy";

// Per-user OPFS file isolates multi-account browsers. Lazy `sqlocal/drizzle`
// import keeps the ~1.5MB WASM out of non-chat/playground chunks.
// Type augmentation for sqlocal lives in `@/lib/types/sqlocal.d.ts`.

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

function buildLocalClient(sql: SQLocalDrizzle): LocalClient {
  const db = drizzle(sql.driver, sql.batchDriver, {
    schema: { ...shared, ...client },
  });
  return {
    db,
    exec: sql.exec.bind(sql),
    transaction: (cb) => sql.transaction(cb),
    destroy: () => sql.destroy(),
    deleteDatabaseFile: () => sql.deleteDatabaseFile(),
    getDatabaseFile: () => sql.getDatabaseFile(),
    overwriteDatabaseFile: (file) => sql.overwriteDatabaseFile(file),
    reactiveQuery: sql.reactiveQuery.bind(sql),
  };
}

// Sweep abandoned salvage temp files. The dev recovery path creates
// `<dbPath>.recover-<timestamp>` files and deletes them on success, but
// a hard reload or process kill in the middle leaves orphans.
async function sweepRecoveryFiles(): Promise<void> {
  if (typeof navigator === "undefined" || !navigator.storage?.getDirectory) {
    return;
  }
  try {
    const root = await navigator.storage.getDirectory();
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    for await (const [name] of root.entries()) {
      const match = name.match(/\.recover-(\d+)$/);
      if (!match) continue;
      const ts = Number(match[1]);
      if (Number.isFinite(ts) && ts < cutoff) {
        await root.removeEntry(name).catch(() => {});
      }
    }
  } catch (err) {
    logger.debug("OPFS recovery sweep failed", {
      context: "local-db.client",
      error: String(err),
    });
  }
}

async function openClient(userId: number): Promise<LocalClient> {
  const { SQLocalDrizzle } = await import("sqlocal/drizzle");
  const dbPath = `${env.appName.toLowerCase()}-${userId}.sqlite3`;
  let sql = new SQLocalDrizzle({ databasePath: dbPath, reactive: false });

  // Fire-and-forget: don't block first-load on a directory scan.
  void sweepRecoveryFiles();

  const { runMigrations } = await import("./schema-migrate/migrations");
  try {
    await runMigrations(sql);
  } catch (err) {
    // Dev: schema reset after `bun db:reset` leaves stale OPFS tables that
    // collide on fresh migration tags. Best-effort salvage: copy rows from
    // broken instance into a fresh DB, then overwrite original file bytes.
    // Falls back to wipe if salvage itself fails. Production never wipes
    // (user data is precious; export instead).
    if (!IS_DEV) throw err;
    logger.warn("Local DB migration failed in dev; attempting salvage", {
      context: "local-db.client",
      userId,
      error: String(err),
    });

    const tempPath = `${dbPath}.recover-${Date.now()}`;
    let fresh: SQLocalDrizzle | null = null;
    try {
      fresh = new SQLocalDrizzle({ databasePath: tempPath, reactive: false });
      await runMigrations(fresh);
      const brokenClient = buildLocalClient(sql);
      const freshClient = buildLocalClient(fresh);
      const result = await copyAllTables(brokenClient, freshClient, {
        skipTables: LOCAL_ONLY_TABLES,
      });
      logger.info("Local DB salvage copy complete", {
        context: "local-db.client.salvage",
        userId,
        rows: result.copied,
        failures: result.failures.length,
      });
      const blob = await fresh.getDatabaseFile();
      await sql.overwriteDatabaseFile(blob);
      await fresh.destroy().catch(() => {});
      await new SQLocalDrizzle({ databasePath: tempPath, reactive: false })
        .deleteDatabaseFile()
        .catch(() => {});
      fresh = null;
      await sql.destroy().catch(() => {});
      sql = new SQLocalDrizzle({ databasePath: dbPath, reactive: false });
    } catch (salvageErr) {
      logger.error("Local DB salvage failed; falling back to wipe", {
        context: "local-db.client.salvage",
        userId,
        error: String(salvageErr),
      });
      await fresh?.destroy().catch(() => {});
      await sql.deleteDatabaseFile().catch(() => {});
      await sql.destroy().catch(() => {});
      sql = new SQLocalDrizzle({ databasePath: dbPath, reactive: false });
      await runMigrations(sql);
    }
  }

  const wrapped = buildLocalClient(sql);

  // Release SAH on unload, else Chromium/Brave keeps OPFS bytes in "orphan"
  // state until eviction. `beforeunload` covers browsers without pagehide.
  // Cache eviction must come BEFORE destroy so a BFcache restore reopens a
  // fresh handle instead of returning the destroyed promise.
  if (typeof window !== "undefined") {
    const release = () => {
      cached.delete(userId);
      void sql.destroy().catch(() => {});
    };
    window.addEventListener("pagehide", release, { once: true });
    window.addEventListener("beforeunload", release, { once: true });
    // Dev-only debug surface. In prod the globals leak the local DB into
    // any XSS or third-party script context.
    if (IS_DEV) {
      window.__local = wrapped;
      window.__shared = shared;
      window.__sqlocal = sql;
    }
  }
  return wrapped;
}

export function resetLocalDbCache() {
  cached = new Map();
}
