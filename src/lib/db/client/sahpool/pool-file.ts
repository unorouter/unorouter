"use client";

import { sahPoolDirName } from "@/lib/db/client/sahpool/pool-name";

// Every pool slot is a 4096-byte header (logical path, NUL padded, then flags
// and digest) followed by plain SQLite bytes.
export const SAH_POOL_HEADER_BYTES = 4096;

// A disk-backed File for one logical pool file, read on the main thread with
// no worker round trip and nothing materialized: getFile() is a handle and
// slice() is lazy, so a 500MB database costs no heap until something reads it.
// Chromium hands this out while the worker holds the sync access handle.
export async function findPoolFile(
  databasePath: string,
  logicalName: string,
  filename: string,
): Promise<File | null> {
  const root = await navigator.storage.getDirectory();
  const poolDir = await root.getDirectoryHandle(sahPoolDirName(databasePath));
  let filesDir = poolDir;
  try {
    filesDir = await poolDir.getDirectoryHandle(".opaque");
  } catch {
    // Older layouts kept the slot files directly under the pool directory.
  }
  const decoder = new TextDecoder();
  for await (const [, handle] of filesDir.entries()) {
    if (handle.kind !== "file") continue;
    const file = await handle.getFile();
    if (file.size <= SAH_POOL_HEADER_BYTES) continue;
    const head = new Uint8Array(await file.slice(0, 512).arrayBuffer());
    const end = head.indexOf(0);
    const path = decoder.decode(head.subarray(0, end < 0 ? head.length : end));
    if (path !== logicalName) continue;
    return new File([file.slice(SAH_POOL_HEADER_BYTES)], filename, {
      type: "application/x-sqlite3",
    });
  }
  return null;
}
