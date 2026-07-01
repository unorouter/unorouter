import { SQLocalDrizzle } from "sqlocal/drizzle";

// Shared SQLocalDrizzle factory: non-reactive, releases the SyncAccessHandle on unload.
export function newSql(dbPath: string): SQLocalDrizzle {
  return new SQLocalDrizzle({
    databasePath: dbPath,
    reactive: false,
    releaseOnUnload: true,
  });
}
