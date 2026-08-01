"use client";

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
  bytes: Uint8Array<ArrayBuffer>;
  sizeBytes: number;
  // "pool" = an opaque slot file inside the pool directory (the orphan case).
  // "root" = a plain database at the OPFS root, e.g. a `.pre-sahpool` rollback
  // copy, which is a NORMAL post-migration leftover and not evidence of loss.
  source: "pool" | "root";
};

function hasSqliteMagic(head: Uint8Array): boolean {
  if (head.length < SQLITE_MAGIC.length) return false;
  for (let i = 0; i < SQLITE_MAGIC.length; i++) {
    if (head[i] !== SQLITE_MAGIC.charCodeAt(i)) return false;
  }
  return true;
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

  const found: SalvagedDb[] = [];
  for await (const [name, handle] of filesDir.entries()) {
    if (handle.kind !== "file") continue;
    try {
      const file = await handle.getFile();
      if (file.size <= HEADER_BYTES) continue;
      const head = new Uint8Array(
        await file.slice(HEADER_BYTES, HEADER_BYTES + 16).arrayBuffer(),
      );
      if (!hasSqliteMagic(head)) continue;
      const body = await file.slice(HEADER_BYTES).arrayBuffer();
      found.push({
        fileName: name,
        bytes: new Uint8Array(body),
        sizeBytes: body.byteLength,
        source: "pool",
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
      const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
      if (!hasSqliteMagic(head)) continue;
      found.push({
        fileName: name,
        bytes: new Uint8Array(await file.arrayBuffer()),
        sizeBytes: file.size,
        source: "root",
      });
    } catch {
      // Locked by a live handle (the current db): skip.
    }
  }

  found.sort((a, b) => b.sizeBytes - a.sizeBytes);
  logChatDebug("db.salvage.scan", {
    dbPath,
    candidates: found.map((f) => ({ name: f.fileName, bytes: f.sizeBytes })),
  });
  return found;
}
