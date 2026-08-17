"use client";

import { env } from "@/lib/config/env";
import { sahPoolDirName } from "@/lib/db/client/sahpool/pool-name";
import { logChatDebug } from "@/lib/utils/chat-debug-log";

// opfs-sahpool stores each pool file with a 4096-byte header (the logical
// filename + flags + a digest of them) followed by the real SQLite bytes. The
// VFS verifies that digest on every pool install and, when it fails, SILENTLY
// drops the name mapping and returns the slot to the free list - the data is
// untouched but nothing points at it, so the next open creates a fresh empty
// database under the same logical name.
//
// A torn header is exactly what an abrupt process kill produces: setAssociatedPath
// writes the body and the digest in two separate calls, and iOS Safari discards
// background tabs mid-write. Hence this salvage path: read every file in the pool
// directory past the header and recover the ones that are real databases.
const HEADER_BYTES = 4096;
const SQLITE_MAGIC = "SQLite format 3\0";

export type SalvagedDb = {
  fileName: string;
  sizeBytes: number;
  // "pool" = an opaque slot file inside the pool directory (the orphan case).
  // "root" = a plain database at the OPFS root, e.g. a `.pre-sahpool` rollback
  // copy, which is a NORMAL post-migration leftover and not evidence of loss.
  source: "pool" | "root";
  // Last write time, so an operator can tell a fresh orphan from a months-old
  // rollback copy without opening either.
  modifiedAt: number;
  // True for the database this page currently has open. Without it a user
  // picking from the list cannot tell their recovered data from the empty
  // replacement they are already looking at.
  isLive: boolean;
  // SQLite page count x page size, both read out of the 100-byte file header.
  // Cheap (one 100-byte read) and enough to rank candidates by real content.
  pageSize: number;
  pageCount: number;
  // A Blob VIEW of the database bytes, not a copy: scanning must never pull
  // candidates into memory. These files run to hundreds of MB (media is inlined
  // base64), and materializing even one is enough to OOM a phone - which is
  // exactly the device this recovery path exists for.
  blob: Blob;
};

function hasSqliteMagic(head: Uint8Array): boolean {
  if (head.length < SQLITE_MAGIC.length) return false;
  for (let i = 0; i < SQLITE_MAGIC.length; i++) {
    if (head[i] !== SQLITE_MAGIC.charCodeAt(i)) return false;
  }
  return true;
}

// SQLite's 100-byte header: page size is a big-endian u16 at offset 16 (the
// value 1 means 65536), page count a big-endian u32 at offset 28.
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

// Every per-user database present in OPFS, not just the signed-in one. Each db
// gets its own pool directory named from its path, so the root listing IS the
// set of databases this browser holds: the guest db from before a login, and any
// other account used on this device. Without this the studio can only see and
// export the ACTIVE user, so a backup silently omits the rest.
export async function listLocalDatabases(): Promise<
  { userId: number; dbPath: string }[]
> {
  const appName = env.appName.toLowerCase();
  const prefix = sahPoolDirName(`${appName}-`).replace(/-$/, "");
  const found: { userId: number; dbPath: string }[] = [];
  try {
    const root = await navigator.storage.getDirectory();
    for await (const [name, handle] of root.entries()) {
      if (handle.kind !== "directory" || !name.startsWith(prefix)) continue;
      const match = name.match(/-(\d+)_sqlite3$/);
      if (!match) continue;
      found.push({
        userId: Number(match[1]),
        dbPath: `${appName}-${match[1]}.sqlite3`,
      });
    }
  } catch {
    return [];
  }
  found.sort((a, b) => a.userId - b.userId);
  logChatDebug("db.list_local", { databases: found.map((f) => f.userId) });
  return found;
}

// Every SQLite database in the pool directory, largest first. Includes the
// LIVE database as well as orphaned ones; the caller picks (the live db is
// usually the small freshly-migrated one, the orphan is the big one).
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
  // The VFS keeps its slot files inside an ".opaque" subdirectory.
  let filesDir: FileSystemDirectoryHandle = poolDir;
  try {
    filesDir = await poolDir.getDirectoryHandle(".opaque");
  } catch {
    // Older layouts kept the slot files directly under the pool directory.
  }

  // Which slot currently holds the live database. The slot's own 4096-byte
  // header carries the logical filename it is associated with, so read that
  // rather than guessing: an orphan's header still parses as SQLite but no
  // longer names the live db (that is the whole failure mode).
  const liveNames = new Set<string>();
  for await (const [name, handle] of filesDir.entries()) {
    if (handle.kind !== "file") continue;
    try {
      const file = await handle.getFile();
      if (file.size <= HEADER_BYTES) continue;
      const raw = new Uint8Array(await file.slice(0, 128).arrayBuffer());
      // The path is a NUL-terminated string at the start of the pool header.
      let end = 0;
      while (end < raw.length && raw[end] !== 0) end++;
      const assoc = new TextDecoder().decode(raw.subarray(0, end));
      if (assoc === `/${dbPath}` || assoc === dbPath) liveNames.add(name);
    } catch {
      // Unreadable slot: it simply won't be marked live.
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

  // Also sweep the OPFS ROOT: a `.pre-sahpool` rollback copy or a leftover
  // pre-migration file is a plain SQLite database with no pool header, and it
  // is just as recoverable. Without this a user whose pool is genuinely empty
  // would be told nothing exists while their old file sits one level up.
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
