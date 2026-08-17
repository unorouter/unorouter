import { SQLiteMemoryDriver } from "sqlocal";
import type {
  DriverConfig,
  Sqlite3,
  Sqlite3InitModule,
  Sqlite3StorageType,
  SQLocalDriver,
} from "sqlocal";
import { sahPoolDirName, sahPoolSlug } from "./pool-name";

type SAHPoolUtil = Awaited<ReturnType<Sqlite3["installOpfsSAHPoolVfs"]>>;

// SQLocal driver for SQLite WASM's "opfs-sahpool" VFS. Unlike the "opfs" VFS
// (SharedArrayBuffer + Atomics, requires cross-origin isolation), sahpool
// needs NO COOP/COEP headers and works on all browsers with OPFS sync access
// handles (Chrome 108+, Safari 16.4+, Firefox 111+). Written in sqlocal's
// driver style so it can be upstreamed.
//
// One pool per database path, each in its own OPFS directory: the VFS holds
// every pool file handle exclusively, and no two pool instances may share a
// directory - per-database pools keep sqlocal's one-instance-one-database
// model and let several databases (live db + import/export scratch files)
// coexist in one page. Logical filenames inside a pool MUST be absolute
// ("/name"), else the VFS resolves import and open to different files.
//
// Capacity: each pool slot is one pre-opened OPFS file handle; a database
// plus journal/temp files needs ~3, so 4 gives headroom without paying the
// O(capacity) handle-open cost of a large pool.
const POOL_CAPACITY = 4;

// installOpfsSAHPoolVfs must only run once per VFS name in a JS context;
// re-registering an existing name rejects. The pool survives db close, so
// re-init after destroy() must reuse the cached util.
const poolCache = new Map<string, Promise<SAHPoolUtil>>();

function absName(databasePath: string): string {
  return `/${databasePath.replace(/^\/+/, "")}`;
}

export class SQLiteSahPoolDriver
  extends SQLiteMemoryDriver
  implements SQLocalDriver
{
  // Reported as "opfs" so consumers keyed on persistent-vs-memory storage
  // (the app's fallback detection, diagnostics) behave identically to the
  // original opfs driver.
  override readonly storageType: Sqlite3StorageType = "opfs";

  protected poolUtil?: SAHPoolUtil;

  constructor(sqlite3InitModule?: Sqlite3InitModule) {
    super(sqlite3InitModule);
  }

  protected async getPool(databasePath: string): Promise<SAHPoolUtil> {
    if (!this.sqlite3InitModule) {
      const { default: sqlite3InitModule } =
        await import("@sqlite.org/sqlite-wasm");
      this.sqlite3InitModule = sqlite3InitModule;
    }
    if (!this.sqlite3) {
      this.sqlite3 = await this.sqlite3InitModule();
    }

    const name = `sahpool-${sahPoolSlug(databasePath)}`;
    let pool = poolCache.get(name);
    if (!pool) {
      pool = this.sqlite3
        .installOpfsSAHPoolVfs({
          name,
          directory: sahPoolDirName(databasePath),
          initialCapacity: POOL_CAPACITY,
        })
        .then(async (util) => {
          await util.reserveMinimumCapacity(POOL_CAPACITY);
          return util;
        });
      poolCache.set(name, pool);
      // The reason the pool would not install is the ONE fact that says why a
      // user is stuck on the in-memory fallback, and it used to die here: the
      // app only ever saw "OpfsSAHPool unavailable", which names the symptom
      // for every possible cause (locked by another tab, OPFS blocked by
      // policy, quota, a torn pool directory).
      pool.catch((err) => {
        poolCache.delete(name);
        this.lastPoolError = String(
          (err as Error)?.stack ?? (err as Error)?.message ?? err,
        ).slice(0, 400);
      });
    }
    return pool;
  }

  // Read by the worker so the failure reason can reach the page, since a
  // rejected install leaves no other trace on the driver.
  lastPoolError?: string;

  override async init(config: DriverConfig): Promise<void> {
    const { databasePath } = config;

    if (!databasePath) {
      throw new Error("No databasePath specified");
    }

    this.poolUtil = await this.getPool(databasePath);

    // The pool is cached per VFS name and survives destroy(), so one left
    // paused by a handover (or by a failed open releasing its handles) would
    // otherwise be handed back still paused and every statement would fail.
    if (this.poolUtil.isPaused()) {
      await this.poolUtil.unpauseVfs();
    }

    if (this.db) {
      await this.destroy();
    }

    this.db = new this.poolUtil.OpfsSAHPoolDb(absName(databasePath));
    this.config = config;
    this.initWriteHook();
  }

  override async isDatabasePersisted(): Promise<boolean> {
    return navigator.storage?.persisted();
  }

  override async import(
    database:
      | ArrayBuffer
      | Uint8Array<ArrayBuffer>
      | ReadableStream<Uint8Array<ArrayBuffer>>,
  ): Promise<void> {
    if (!this.poolUtil || !this.config?.databasePath) {
      throw new Error("Driver not initialized");
    }

    await this.destroy();

    // Streams feed importDb's chunked-callback form so a large database is
    // never materialized in memory.
    let data:
      | ArrayBuffer
      | Uint8Array<ArrayBuffer>
      | (() => Promise<Uint8Array<ArrayBuffer> | undefined>);
    if (database instanceof ReadableStream) {
      const reader = database.getReader();
      data = async () => {
        const chunk = await reader.read();
        if (chunk.done) reader.releaseLock();
        return chunk.value;
      };
    } else {
      data = database;
    }

    await this.poolUtil.importDb(absName(this.config.databasePath), data);
  }

  override async export(): Promise<{
    name: string;
    data: ArrayBuffer | Uint8Array<ArrayBuffer>;
  }> {
    if (!this.db || !this.poolUtil || !this.config?.databasePath) {
      throw new Error("Driver not initialized");
    }

    const name = absName(this.config.databasePath).slice(1);
    const tempName = `/backup-${Date.now()}--${name}`;

    // VACUUM INTO writes a compacted copy through the same VFS (so it lands
    // in the pool), then exportFile reads it back out as plain SQLite bytes
    // (pool files carry a private header and are not directly readable).
    this.db.exec({ sql: "VACUUM INTO ?", bind: [tempName] });
    try {
      const raw = await this.poolUtil.exportFile(tempName);
      // The processor posts the exported data with a transfer list, which
      // only accepts a plain ArrayBuffer (the opfs driver returns
      // file.arrayBuffer()); exportFile's Uint8Array view over WASM memory
      // is untransferable (DataCloneError). Copy into a standalone buffer.
      const data = new Uint8Array(raw).buffer as ArrayBuffer;
      return { name, data };
    } finally {
      this.poolUtil.unlink(tempName);
    }
  }

  override async clear(): Promise<void> {
    await this.purgeOrphans();
  }

  // Not on the published 0.18.0 driver interface yet (exists upstream);
  // plain method here, becomes an override when sqlocal releases it.
  async purgeOrphans(): Promise<string[]> {
    if (!this.poolUtil || !this.config?.databasePath) {
      throw new Error("Driver not initialized");
    }

    await this.destroy();

    const main = absName(this.config.databasePath);
    const backupSuffix = `--${main.slice(1)}`;
    const removed: string[] = [];

    for (const fileName of this.poolUtil.getFileNames()) {
      const isMain = fileName === main;
      const isSidecar = fileName.startsWith(`${main}-`);
      const isBackup =
        fileName.startsWith("/backup-") && fileName.endsWith(backupSuffix);
      if (!isMain && !isSidecar && !isBackup) continue;
      if (this.poolUtil.unlink(fileName)) removed.push(fileName);
    }

    return removed;
  }

  // Cooperative multi-tab handover (not on the sqlocal driver interface yet):
  // pause releases every sync access handle so another tab's pool instance can
  // acquire them; resume takes them back and reopens the same database.
  // pauseVfs throws while any db is open, hence the close-first.
  async pause(): Promise<void> {
    if (!this.poolUtil || this.poolUtil.isPaused()) return;
    this.closeDb();
    this.poolUtil.pauseVfs();
  }

  async resume(): Promise<void> {
    if (!this.poolUtil || !this.config?.databasePath) {
      throw new Error("Driver not initialized");
    }
    if (this.poolUtil.isPaused()) {
      await this.poolUtil.unpauseVfs();
    }
    if (!this.db) {
      this.db = new this.poolUtil.OpfsSAHPoolDb(
        absName(this.config.databasePath),
      );
      this.initWriteHook();
    }
  }

  override async destroy(): Promise<void> {
    this.closeDb();
    this.writeCallbacks.clear();
  }
}
