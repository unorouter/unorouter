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

// One pool per database path, each in its own OPFS directory: the VFS holds
// every pool file handle exclusively, so no two pool instances may share a
// directory. Logical filenames inside a pool MUST be absolute ("/name"), else
// the VFS resolves import and open to different files.
//
// A slot is one pre-opened OPFS file handle and a database plus journal/temp
// needs ~3, so 4 gives headroom without the O(capacity) handle-open cost.
const POOL_CAPACITY = 4;

// installOpfsSAHPoolVfs rejects on re-registering a VFS name, and the pool
// survives db close, so re-init after destroy() must reuse the cached util.
const poolCache = new Map<string, Promise<SAHPoolUtil>>();

function absName(databasePath: string): string {
  return `/${databasePath.replace(/^\/+/, "")}`;
}

export class SQLiteSahPoolDriver
  extends SQLiteMemoryDriver
  implements SQLocalDriver
{
  // "opfs" so consumers keyed on persistent-vs-memory storage (fallback
  // detection, diagnostics) treat this like the original opfs driver.
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
      // The install rejection reason is the only thing distinguishing the
      // causes of the in-memory fallback (another tab's lock, OPFS blocked by
      // policy, quota, a torn pool directory).
      pool.catch((err) => {
        poolCache.delete(name);
        this.lastPoolError = String(
          err instanceof Error ? (err.stack ?? err.message) : err,
        ).slice(0, 400);
      });
    }
    return pool;
  }

  lastPoolError?: string;

  override async init(config: DriverConfig): Promise<void> {
    const { databasePath } = config;

    if (!databasePath) {
      throw new Error("No databasePath specified");
    }

    this.poolUtil = await this.getPool(databasePath);

    // The cached pool survives destroy(), so one left paused by a handover
    // would be handed back paused and every statement would fail.
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

    // VACUUM INTO lands a compacted copy in the pool, then exportFile reads it
    // back as plain SQLite bytes (pool files carry a private header).
    this.db.exec({ sql: "VACUUM INTO ?", bind: [tempName] });
    try {
      const raw = await this.poolUtil.exportFile(tempName);
      // exportFile's Uint8Array view over WASM memory is untransferable, and
      // the processor posts with a transfer list, so it throws DataCloneError.
      const data = new Uint8Array(raw).buffer;
      return { name, data };
    } finally {
      this.poolUtil.unlink(tempName);
    }
  }

  override async clear(): Promise<void> {
    await this.purgeOrphans();
  }

  // Not on the published sqlocal 0.18.0 driver interface yet, so not an
  // override.
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

  // Multi-tab handover: pause releases every sync access handle so another
  // tab's pool can acquire them. pauseVfs throws while any db is open, hence
  // the close first.
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
