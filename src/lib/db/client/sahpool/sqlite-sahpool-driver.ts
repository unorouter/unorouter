import { SQLiteMemoryDriver } from "sqlocal";
import type {
  DriverConfig,
  Sqlite3,
  Sqlite3InitModule,
  Sqlite3StorageType,
  SQLocalDriver,
} from "sqlocal";
import { sahPoolDirName, sahPoolSlug } from "./pool-name";
import { poolLog, snapshotSlots } from "./pool-log";

type SAHPoolUtil = Awaited<ReturnType<Sqlite3["installOpfsSAHPoolVfs"]>>;

// No two pool instances may share an OPFS directory (the VFS holds every file
// handle exclusively). Logical filenames inside a pool MUST be absolute
// ("/name"), else the VFS resolves import and open to different files.
// An export needs up to five at once: the live file, its journal while a reply
// is being written, the VACUUM INTO copy, that copy's journal during the
// deletes, and VACUUM's scratch. Four fit only on an idle tab.
const POOL_CAPACITY = 8;

// installOpfsSAHPoolVfs rejects on re-registering a VFS name, so re-init after
// destroy() must reuse the cached util.
const poolCache = new Map<string, Promise<SAHPoolUtil>>();

// What every slot held right before the pool reads its headers, so a log
// shows which header decision lost a database.
async function logSlots(
  event: string,
  databasePath: string,
  data: Record<string, unknown> = {},
) {
  try {
    poolLog(event, {
      ...data,
      slots: await snapshotSlots(sahPoolDirName(databasePath)),
    });
  } catch (err) {
    poolLog(event, { ...data, slotsError: String(err).slice(0, 200) });
  }
}

function absName(databasePath: string): string {
  return `/${databasePath.replace(/^\/+/, "")}`;
}

export class SQLiteSahPoolDriver
  extends SQLiteMemoryDriver
  implements SQLocalDriver
{
  override readonly storageType: Sqlite3StorageType = "opfs";

  protected poolUtil?: SAHPoolUtil;

  constructor(sqlite3InitModule?: Sqlite3InitModule) {
    super(sqlite3InitModule);
  }

  protected async getPool(databasePath: string): Promise<SAHPoolUtil> {
    if (!this.sqlite3) {
      const init =
        this.sqlite3InitModule ??
        (await import("@sqlite.org/sqlite-wasm")).default;
      if (!init)
        throw new Error("@sqlite.org/sqlite-wasm has no default export");
      this.sqlite3InitModule = init;
      this.sqlite3 = await init();
    }

    const name = `sahpool-${sahPoolSlug(databasePath)}`;
    let pool = poolCache.get(name);
    if (!pool) {
      await logSlots("db.pool.install.start", databasePath);
      pool = this.sqlite3
        .installOpfsSAHPoolVfs({
          name,
          directory: sahPoolDirName(databasePath),
          initialCapacity: POOL_CAPACITY,
        })
        .then(async (util) => {
          await util.reserveMinimumCapacity(POOL_CAPACITY);
          poolLog("db.pool.install.done", { files: util.getFileNames() });
          return util;
        });
      poolCache.set(name, pool);
      pool.catch((err) => {
        poolCache.delete(name);
        void logSlots("db.pool.install.failed", databasePath, {
          error: String(err).slice(0, 300),
        });
        // A DOMException carries an empty stack in Firefox, and `??` keeps an
        // empty string, which is how a whole export arrived with poolError "".
        this.lastPoolError = (
          err instanceof Error
            ? `${err.name}: ${err.message}${err.stack ? `\n${err.stack}` : ""}`
            : String(err)
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

    // The cached pool survives destroy(), so one left paused by a handover is
    // handed back paused and every statement fails.
    if (this.poolUtil.isPaused()) {
      await this.unpause(databasePath);
    }

    if (this.db) {
      await this.destroy();
    }

    // A journal listed here is played back on the first read, onto whatever
    // file carries the name, so it is the one witness of how a db emptied.
    this.filesAtOpen = this.poolUtil.getFileNames();
    this.db = new this.poolUtil.OpfsSAHPoolDb(absName(databasePath));
    this.config = config;
    this.initWriteHook();
  }

  filesAtOpen?: string[];

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

    // Pool files carry a private header; exportFile reads back plain SQLite bytes.
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

  // A pool file other than the live database, already written by VACUUM INTO
  // on the live connection. One materialization, on this thread only.
  async exportPoolFile(name: string): Promise<ArrayBuffer> {
    if (!this.poolUtil) throw new Error("Driver not initialized");
    const raw = await this.poolUtil.exportFile(name);
    return new Uint8Array(raw).buffer;
  }

  unlinkPoolFile(name: string): void {
    if (!this.poolUtil) throw new Error("Driver not initialized");
    this.poolUtil.unlink(name);
  }

  override async clear(): Promise<void> {
    await this.purgeOrphans();
  }

  // Not on the published sqlocal 0.18.0 driver interface, so not an override.
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

  // pauseVfs throws while any db is open, hence the close first.
  async pause(): Promise<void> {
    if (!this.poolUtil || this.poolUtil.isPaused()) return;
    this.closeDb();
    this.poolUtil.pauseVfs();
    poolLog("db.pool.paused");
  }

  // Resuming re-reads every slot header, the same read that wiped two iOS pools.
  private async unpause(databasePath: string): Promise<void> {
    if (!this.poolUtil) return;
    await logSlots("db.pool.resume.start", databasePath);
    try {
      await this.poolUtil.unpauseVfs();
    } catch (err) {
      await logSlots("db.pool.resume.failed", databasePath, {
        error: String(err).slice(0, 300),
      });
      throw err;
    }
    poolLog("db.pool.resume.done", { files: this.poolUtil.getFileNames() });
  }

  async resume(): Promise<void> {
    if (!this.poolUtil || !this.config?.databasePath) {
      throw new Error("Driver not initialized");
    }
    if (this.poolUtil.isPaused()) {
      await this.unpause(this.config.databasePath);
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
