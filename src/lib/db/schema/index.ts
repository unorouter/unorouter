// The SERVER's schema, and nothing else. drizzle.server.config.ts generates
// Turso migrations from this file, so anything re-exported here becomes a table
// the server owns and migrates. The chat tables in ./shared exist ONLY in the
// browser's OPFS database and must never be re-exported here: doing so makes
// editing any chat table emit a destructive Turso migration.
export * from "./tester";
