import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Subprocess } from "bun";

// Sync access handles exist only in a browser worker, so this drives headless
// Chrome against the sqlite-wasm in node_modules, patch applied.
const ROOT = join(import.meta.dir, "..");
const SQLITE_DIST = join(ROOT, "node_modules/@sqlite.org/sqlite-wasm/dist");
const ROWS = 300;

const chrome = [
  process.env.CHROME_BIN,
  "/usr/bin/google-chrome-stable",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].find((p) => p && Bun.file(p).size > 0);

const TYPES: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".wasm": "application/wasm",
};

let server: ReturnType<typeof Bun.serve>;
let browser: Subprocess;
let profile: string;
let cdp: WebSocket;
let nextId = 0;
const pending = new Map<number, (msg: CdpReply) => void>();

type CdpReply = {
  id?: number;
  result?: Record<string, unknown>;
  error?: { message: string };
};

function send(
  method: string,
  params: Record<string, unknown> = {},
  sessionId?: string,
): Promise<CdpReply> {
  const id = ++nextId;
  return new Promise((resolve) => {
    pending.set(id, resolve);
    cdp.send(JSON.stringify({ id, method, params, sessionId }));
  });
}

async function devtoolsUrl(dir: string): Promise<string> {
  for (let i = 0; i < 100; i++) {
    try {
      const [port, path] = readFileSync(
        join(dir, "DevToolsActivePort"),
        "utf8",
      ).split("\n");
      return `ws://127.0.0.1:${port}${path}`;
    } catch {
      await Bun.sleep(100);
    }
  }
  throw new Error("Chrome did not start");
}

async function run(scenario: string): Promise<Record<string, unknown>> {
  const { result: ctx } = await send("Target.createBrowserContext");
  const browserContextId = ctx?.browserContextId;
  const { result: target } = await send("Target.createTarget", {
    url: "about:blank",
    browserContextId,
  });
  const { result: attached } = await send("Target.attachToTarget", {
    targetId: target?.targetId,
    flatten: true,
  });
  const sessionId = String(attached?.sessionId);
  try {
    await send(
      "Page.navigate",
      { url: `http://127.0.0.1:${server.port}/?scenario=${scenario}` },
      sessionId,
    );
    for (let i = 0; i < 300; i++) {
      await Bun.sleep(100);
      const reply = await send(
        "Runtime.evaluate",
        {
          expression: "JSON.stringify(window.__result ?? null)",
          returnByValue: true,
        },
        sessionId,
      );
      const value = (reply.result?.result as { value?: string } | undefined)
        ?.value;
      if (value && value !== "null") return JSON.parse(value);
    }
    throw new Error(`${scenario} timed out`);
  } finally {
    await send("Target.disposeBrowserContext", { browserContextId });
  }
}

describe.skipIf(!chrome && !process.env.CI)("sahpool data loss", () => {
  beforeAll(async () => {
    if (!chrome) throw new Error("no Chrome found, set CHROME_BIN");
    server = Bun.serve({
      port: 0,
      async fetch(req) {
        const path = new URL(req.url).pathname;
        const file = path.startsWith("/sqlite/")
          ? join(SQLITE_DIST, path.slice("/sqlite/".length))
          : join(
              import.meta.dir,
              "sahpool",
              path === "/" ? "index.html" : path,
            );
        const body = Bun.file(file);
        if (!(await body.exists())) return new Response("", { status: 404 });
        const ext = file.slice(file.lastIndexOf("."));
        return new Response(body, {
          headers: { "content-type": TYPES[ext] ?? "application/octet-stream" },
        });
      },
    });
    profile = mkdtempSync(join(tmpdir(), "sahpool-chrome-"));
    browser = Bun.spawn(
      [
        chrome,
        "--headless=new",
        "--no-first-run",
        "--no-default-browser-check",
        "--remote-debugging-port=0",
        `--user-data-dir=${profile}`,
        "about:blank",
      ],
      { stdout: "ignore", stderr: "ignore" },
    );
    cdp = new WebSocket(await devtoolsUrl(profile));
    cdp.onmessage = (e) => {
      const msg: CdpReply = JSON.parse(String(e.data));
      if (msg.id && pending.has(msg.id)) {
        pending.get(msg.id)?.(msg);
        pending.delete(msg.id);
      }
    };
    await new Promise((resolve) => (cdp.onopen = resolve));
  }, 30_000);

  afterAll(() => {
    cdp?.close();
    browser?.kill();
    server?.stop(true);
    if (profile) rmSync(profile, { recursive: true, force: true });
  });

  test("a torn header (flags zeroed) keeps the database", async () => {
    const r = await run("tornHeaderFlags");
    expect(r).toMatchObject({ unpause: "resolved", rows: ROWS });
    expect(r.slotBytes).toBe(r.before);
  }, 30_000);

  test("a stale digest keeps the database", async () => {
    const r = await run("badDigest");
    expect(r).toMatchObject({ unpause: "resolved", rows: ROWS });
    expect(r.slotBytes).toBe(r.before);
  }, 30_000);

  test("a zero byte header read at startup fails loudly and keeps the files", async () => {
    const r = await run("shortHeaderReadAtStartup");
    expect(String(r.install)).toStartWith("rejected");
    expect(r.slotBytes).toBe(r.before);
    expect(r.rows).toBe(ROWS);
  }, 30_000);

  test("a zero byte header read on resume fails loudly and keeps the files", async () => {
    const r = await run("shortHeaderReadOnResume");
    expect(String(r.unpause)).toStartWith("rejected");
    expect(r.slotBytes).toBe(r.before);
    expect(r.rows).toBe(ROWS);
  }, 30_000);

  test("short data reads fail the query instead of returning zeroed pages", async () => {
    const r = await run("shortDataRead");
    expect(String(r.query)).toContain("I/O error");
    expect(r.rows).toBe(ROWS);
  }, 30_000);

  test("a delete-on-close scratch file is still cleaned up", async () => {
    const r = await run("scratchStillCleaned");
    expect(r).toMatchObject({ unpause: "resolved", rows: ROWS });
    expect(r.scratchBytes).toBe(4096);
  }, 30_000);
});
