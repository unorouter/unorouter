// Replays the ways real users lost their local database, against the patched
// sqlite-wasm the app ships. Each scenario gets its own pool directory.
import init from "/sqlite/index.mjs";

const ROWS = 300;
// Same as sqlite-sahpool-driver.ts.
const POOL_OPTIONS = { initialCapacity: 8, preserveOnInitFailure: true };
const HEADER_OFFSET_FLAGS = 512;
const HEADER_OFFSET_DIGEST = 516;

const proto = FileSystemSyncAccessHandle.prototype;
const realRead = proto.read;
let headerReadFailures = 0;
let dataReadFailures = 0;
proto.read = function (buffer, options) {
  const at = options?.at ?? 0;
  if (at === 0 && headerReadFailures > 0) {
    headerReadFailures--;
    return 0;
  }
  if (at > 4096 && dataReadFailures > 0) {
    dataReadFailures--;
    return 0;
  }
  return realRead.call(this, buffer, options);
};

const sqlite3 = await init({ print: () => {}, printErr: () => {} });
const root = await navigator.storage.getDirectory();
let seq = 0;

async function setup() {
  const directory = `pool-test-${Date.now()}-${seq++}`;
  const name = `vfs-${directory}`;
  const pool = await sqlite3.installOpfsSAHPoolVfs({
    ...POOL_OPTIONS,
    name,
    directory,
  });
  const db = new pool.OpfsSAHPoolDb("/test.db");
  db.exec(
    `create table t(x); with recursive c(i) as (select 1 union all select i+1 from c where i<${ROWS}) insert into t select randomblob(1000) from c`,
  );
  db.close();
  const opaque = await (
    await root.getDirectoryHandle(directory)
  ).getDirectoryHandle(".opaque");
  return { pool, name, directory, opaque, slot: await findSlot(opaque) };
}

async function findSlot(opaque) {
  for await (const [, handle] of opaque.entries()) {
    const file = await handle.getFile();
    const head = new Uint8Array(await file.slice(0, 520).arrayBuffer());
    const path = new TextDecoder().decode(head.subarray(0, head.indexOf(0)));
    if (path === "/test.db") return { handle, size: file.size };
  }
  return null;
}

async function write(handle, bytes, at) {
  const sah = await handle.createSyncAccessHandle();
  sah.write(bytes, { at });
  sah.flush();
  sah.close();
}

function count(pool) {
  const db = new pool.OpfsSAHPoolDb("/test.db");
  try {
    return db.selectValue("select count(*) from t");
  } catch (e) {
    return `ERR ${e.message}`;
  } finally {
    db.close();
  }
}

const settle = (p) =>
  p.then(
    () => "resolved",
    (e) => `rejected: ${String(e.message ?? e).slice(0, 120)}`,
  );

const scenarios = {
  // iOS killed the tab between the two header writes: name intact, flags zero.
  async tornHeaderFlags() {
    const t = await setup();
    t.pool.pauseVfs();
    await write(t.slot.handle, new Uint8Array(4), HEADER_OFFSET_FLAGS);
    const unpause = await settle(t.pool.unpauseVfs());
    return {
      unpause,
      rows: count(t.pool),
      slotBytes: (await t.slot.handle.getFile()).size,
      before: t.slot.size,
    };
  },

  // Same kill, digest stale: the 2 GB iOS pool reopened as an empty database.
  async badDigest() {
    const t = await setup();
    t.pool.pauseVfs();
    await write(
      t.slot.handle,
      new Uint8Array(8).fill(0x5a),
      HEADER_OFFSET_DIGEST,
    );
    const unpause = await settle(t.pool.unpauseVfs());
    return {
      unpause,
      rows: count(t.pool),
      slotBytes: (await t.slot.handle.getFile()).size,
      before: t.slot.size,
    };
  },

  // iOS answered the header read with 0 bytes at startup.
  async shortHeaderReadAtStartup() {
    const t = await setup();
    t.pool.pauseVfs();
    headerReadFailures = 50;
    const install = await settle(
      sqlite3.installOpfsSAHPoolVfs({
        ...POOL_OPTIONS,
        name: `${t.name}-startup`,
        directory: t.directory,
      }),
    );
    headerReadFailures = 0;
    const slotBytes = (await t.slot.handle.getFile()).size;
    const reopened = await sqlite3.installOpfsSAHPoolVfs({
      ...POOL_OPTIONS,
      name: `${t.name}-reopen`,
      directory: t.directory,
    });
    return { install, slotBytes, before: t.slot.size, rows: count(reopened) };
  },

  // The same short read while resuming a paused pool (tab back from background).
  async shortHeaderReadOnResume() {
    const t = await setup();
    t.pool.pauseVfs();
    headerReadFailures = 50;
    const unpause = await settle(t.pool.unpauseVfs());
    headerReadFailures = 0;
    const slotBytes = (await t.slot.handle.getFile()).size;
    if (t.pool.isPaused()) await t.pool.unpauseVfs();
    return { unpause, slotBytes, before: t.slot.size, rows: count(t.pool) };
  },

  // Short reads of data pages must fail the query, not return zeroed pages.
  async shortDataRead() {
    const t = await setup();
    const db = new t.pool.OpfsSAHPoolDb("/test.db");
    dataReadFailures = 1000;
    let query;
    try {
      query = db.selectValue("select count(*) from t where length(x) = 1000");
    } catch (e) {
      query = `ERR ${e.message}`;
    }
    dataReadFailures = 0;
    db.close();
    return { query, rows: count(t.pool) };
  },

  // A delete-on-close scratch file holding data is still cleaned up.
  async scratchStillCleaned() {
    const t = await setup();
    t.pool.pauseVfs();
    let other = null;
    for await (const [, handle] of t.opaque.entries()) {
      if ((await handle.getFile()).size <= 4096) {
        other = handle;
        break;
      }
    }
    const header = new Uint8Array(512);
    header.set(new TextEncoder().encode("/scratch"));
    await write(other, header, 0);
    const flags = new DataView(new ArrayBuffer(4));
    flags.setUint32(
      0,
      sqlite3.capi.SQLITE_OPEN_DELETEONCLOSE |
        sqlite3.capi.SQLITE_OPEN_TEMP_JOURNAL,
    );
    await write(other, new Uint8Array(flags.buffer), HEADER_OFFSET_FLAGS);
    await write(other, new Uint8Array(8192).fill(1), 4096);
    const unpause = await settle(t.pool.unpauseVfs());
    return {
      unpause,
      rows: count(t.pool),
      scratchBytes: (await other.getFile()).size,
    };
  },
};

const name = new URLSearchParams(location.search).get("scenario");
let result;
try {
  result = await scenarios[name]();
} catch (e) {
  result = { fatal: `${e}\n${(e.stack ?? "").slice(0, 400)}` };
}
postMessage(result);
