import { SQLocalDrizzle } from "sqlocal/drizzle";

// Every database runs on the app's sahpool worker (opfs-sahpool VFS, no
// cross-origin isolation needed) instead of sqlocal's default worker (opfs
// VFS, SharedArrayBuffer, COOP/COEP-gated). One worker per database: the
// sahpool driver keeps a pool per database path, so concurrent databases
// (live db + import/export scratch files) never contend for one pool.
export function newSql(dbPath: string): SQLocalDrizzle {
  return new SQLocalDrizzle({
    databasePath: dbPath,
    reactive: false,
    processor: new Worker(
      new URL("./sahpool/sahpool-worker", import.meta.url),
      {
        type: "module",
      },
    ),
  });
}
