// Pool naming shared by the sahpool driver (worker) and main-thread code
// that probes for a pool's existence. One pool per database path; the pool's
// files live under this OPFS directory with VFS-managed opaque names.
export function sahPoolSlug(databasePath: string): string {
  return databasePath.replace(/[^a-zA-Z0-9_-]/g, "_");
}

export function sahPoolDirName(databasePath: string): string {
  return `.sahpool-${sahPoolSlug(databasePath)}`;
}
