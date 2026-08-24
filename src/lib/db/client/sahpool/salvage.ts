"use client";

import { env } from "@/lib/config/env";
import { sahPoolDirName } from "@/lib/db/client/sahpool/pool-name";
import { logChatDebug } from "@/lib/utils/chat-debug-log";

// Each pool file is a 4096-byte header (logical filename + flags + digest)
// followed by the real SQLite bytes.
const HEADER_BYTES = 4096;
const SQLITE_MAGIC = "SQLite format 3\0";

export type SalvagedDb = {
  fileName: string;
  sizeBytes: number;
  // "root" is a plain OPFS-root database (a `.pre-sahpool` rollback copy), a
  // NORMAL post-migration leftover, not evidence of loss.
  source: "pool" | "root";
  modifiedAt: number;
  isLive: boolean;
  pageSize: number;
  pageCount: number;
  // A Blob VIEW, never a copy: these run to hundreds of MB (media is inlined
  // base64) and materializing one OOMs a phone.
  blob: Blob;
};

function hasSqliteMagic(head: Uint8Array): boolean {
  if (head.length < SQLITE_MAGIC.length) return false;
  for (let i = 0; i < SQLITE_MAGIC.length; i++) {
    if (head[i] !== SQLITE_MAGIC.charCodeAt(i)) return false;
  }
  return true;
}

// SQLite header: page size is a big-endian u16 at offset 16 (1 means 65536),
// page count a big-endian u32 at offset 28.
function readHeaderGeometry(head: Uint8Array): {
  pageSize: number;
  pageCount: number;
} {
  const view = new DataView(head.buffer, head.byteOffset, head.byteLength);
  if (head.byteLength < 32) return { pageSize: 0, pageCount: 0 };
  const raw = view.getUint16(16);
  return {
    pageSize: raw === 1 ? 65536 : raw,
    pageCount: view.getUint32(28),
  };
}

export type LocalDatabase = {
  // Null for the live device database, which is not named for any account.
  legacyUserId: number | null;
  dbPath: string;
  // Real SQLite content, pool header excluded.
  sizeBytes: number;
  modifiedAt: number;
};

export async function listLocalDatabases(): Promise<LocalDatabase[]> {
  const appName = env.appName.toLowerCase();
  const found: LocalDatabase[] = [];
  try {
    const root = await navigator.storage.getDirectory();
    for await (const [name, handle] of root.entries()) {
      if (handle.kind !== "directory") continue;
      const entry = describePool(name, appName);
      if (!entry) continue;
      const stats = await measurePool(handle);
      found.push({ ...entry, ...stats });
    }
  } catch {
    return [];
  }
  found.sort((a, b) => (a.legacyUserId ?? -1) - (b.legacyUserId ?? -1));
  logChatDebug("db.list_local", { databases: found });
  return found;
}

// The pool directory name is a pure function of the db path, so a candidate is
// confirmed by rebuilding the directory name, not by parsing it.
function describePool(
  dirName: string,
  appName: string,
): Pick<LocalDatabase, "legacyUserId" | "dbPath"> | null {
  const livePath = `${appName}.sqlite`;
  if (dirName === sahPoolDirName(livePath))
    return { legacyUserId: null, dbPath: livePath };
  const id = Number(dirName.match(/-(\d+)_sqlite3$/)?.[1]);
  if (!Number.isFinite(id)) return null;
  const dbPath = `${appName}-${id}.sqlite3`;
  return dirName === sahPoolDirName(dbPath)
    ? { legacyUserId: id, dbPath }
    : null;
}

// Sum only slots holding a database: the pool preallocates empty slots, so a
// raw directory size reports the same number for every account.
async function measurePool(
  poolDir: FileSystemDirectoryHandle,
): Promise<{ sizeBytes: number; modifiedAt: number }> {
  let filesDir = poolDir;
  try {
    filesDir = await poolDir.getDirectoryHandle(".opaque");
  } catch {
    // Older layouts kept the slot files directly under the pool directory.
  }
  let sizeBytes = 0;
  let modifiedAt = 0;
  try {
    for await (const [, handle] of filesDir.entries()) {
      if (handle.kind !== "file") continue;
      const file = await handle.getFile();
      if (file.size <= HEADER_BYTES) continue;
      const head = new Uint8Array(
        await file.slice(HEADER_BYTES, HEADER_BYTES + 16).arrayBuffer(),
      );
      if (!hasSqliteMagic(head)) continue;
      sizeBytes += file.size - HEADER_BYTES;
      modifiedAt = Math.max(modifiedAt, file.lastModified);
    }
  } catch {
    // A slot held by a live access handle cannot be read.
  }
  return { sizeBytes, modifiedAt };
}

// Largest first, live db included: after an orphaning the live db is the small
// freshly-migrated one and the orphan is the big one.
export async function salvagePoolDatabases(
  dbPath: string,
): Promise<SalvagedDb[]> {
  const root = await navigator.storage.getDirectory();
  let poolDir: FileSystemDirectoryHandle;
  try {
    poolDir = await root.getDirectoryHandle(sahPoolDirName(dbPath));
  } catch {
    return [];
  }
  let filesDir: FileSystemDirectoryHandle = poolDir;
  try {
    filesDir = await poolDir.getDirectoryHandle(".opaque");
  } catch {
    // Older layouts kept the slot files directly under the pool directory.
  }

  // Read the slot header's associated filename rather than guessing: an orphan
  // still parses as SQLite but no longer names the live db.
  const liveNames = new Set<string>();
  for await (const [name, handle] of filesDir.entries()) {
    if (handle.kind !== "file") continue;
    try {
      const file = await handle.getFile();
      if (file.size <= HEADER_BYTES) continue;
      const raw = new Uint8Array(await file.slice(0, 128).arrayBuffer());
      // The pool header starts with the path as a NUL-terminated string.
      let end = 0;
      while (end < raw.length && raw[end] !== 0) end++;
      const assoc = new TextDecoder().decode(raw.subarray(0, end));
      if (assoc === `/${dbPath}` || assoc === dbPath) liveNames.add(name);
    } catch {
      // Unreadable slot: it will not be marked live.
    }
  }

  const found: SalvagedDb[] = [];
  for await (const [name, handle] of filesDir.entries()) {
    if (handle.kind !== "file") continue;
    try {
      const file = await handle.getFile();
      if (file.size <= HEADER_BYTES) continue;
      const head = new Uint8Array(
        await file.slice(HEADER_BYTES, HEADER_BYTES + 100).arrayBuffer(),
      );
      if (!hasSqliteMagic(head)) continue;
      const geo = readHeaderGeometry(head);
      found.push({
        fileName: name,
        sizeBytes: file.size - HEADER_BYTES,
        source: "pool",
        modifiedAt: file.lastModified,
        isLive: liveNames.has(name),
        pageSize: geo.pageSize,
        pageCount: geo.pageCount,
        blob: file.slice(HEADER_BYTES),
      });
    } catch {
      // A slot held by a live access handle can't be read; skip it.
    }
  }

  // OPFS root too: a `.pre-sahpool` rollback copy is a plain SQLite file with
  // no pool header, and is just as recoverable when the pool is genuinely empty.
  for await (const [name, handle] of root.entries()) {
    if (handle.kind !== "file") continue;
    if (!name.includes(".sqlite3")) continue;
    try {
      const file = await handle.getFile();
      if (file.size <= 512) continue;
      const head = new Uint8Array(await file.slice(0, 100).arrayBuffer());
      if (!hasSqliteMagic(head)) continue;
      const geo = readHeaderGeometry(head);
      found.push({
        fileName: name,
        sizeBytes: file.size,
        source: "root",
        modifiedAt: file.lastModified,
        isLive: name === dbPath,
        pageSize: geo.pageSize,
        pageCount: geo.pageCount,
        blob: file,
      });
    } catch {
      // Locked by a live handle (the current db): skip.
    }
  }

  found.sort((a, b) => b.sizeBytes - a.sizeBytes);
  logChatDebug("db.salvage.scan", {
    dbPath,
    candidates: found.map((f) => ({
      name: f.fileName,
      bytes: f.sizeBytes,
      source: f.source,
      isLive: f.isLive,
      pageSize: f.pageSize,
      pageCount: f.pageCount,
      modifiedAt: f.modifiedAt,
    })),
  });
  return found;
}
