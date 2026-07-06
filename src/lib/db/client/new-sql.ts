import { SQLocalDrizzle } from "sqlocal/drizzle";

export function newSql(dbPath: string): SQLocalDrizzle {
  return new SQLocalDrizzle({
    databasePath: dbPath,
    reactive: false,
    releaseOnUnload: true,
  });
}
