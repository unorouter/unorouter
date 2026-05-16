// ---------------------------------------------------------------------------
// Server-build entrypoint. Re-exports shared (mirrored to client) + server
// (Turso-only) schemas. Existing server imports of "@/lib/db/schema" resolve
// here unchanged.
//
// Client code MUST NOT import from this file. Client should import from
// "@/lib/db/schema/shared" and "@/lib/db/schema/client" directly.
// ---------------------------------------------------------------------------

export * from "./shared";
export * from "./server";
