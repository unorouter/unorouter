// The SERVER's schema, and nothing else. drizzle.server.config.ts generates
// Turso migrations from this file, so anything re-exported here becomes a table
// the server owns and migrates.
//
// Only the model-tester tables belong to the server: it stores the public
// leaderboard under GUEST_USER_ID. The chat tables live in ./shared and exist
// ONLY in the browser's OPFS database. While this re-exported ./shared, editing
// any chat table emitted a destructive Turso migration against tables no server
// code has ever read (the mirror was removed long ago and left them behind).
export * from "./tester";
