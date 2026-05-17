#!/usr/bin/env bun
// Prebundle SQLocal's worker into /public/sqlocal so neither webpack nor
// Turbopack touches it. Required because both bundlers mangle the
// `new URL("./worker", import.meta.url)` pattern + can't honor SQLocal's
// module-worker contract (turbopack #79; webpack ships `importScripts` chunk
// loader into module workers). Run from `prebuild` + `postinstall`.
//
// Also copies sqlite3.wasm + sqlite3-opfs-async-proxy.js + sqlite3-worker1.mjs
// so the prebundled worker resolves them as siblings.
import { copyFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const outDir = resolve(root, "public/sqlocal");
mkdirSync(outDir, { recursive: true });

const sqlocalWorker = resolve(root, "node_modules/sqlocal/dist/worker.js");
const out = await Bun.build({
  entrypoints: [sqlocalWorker],
  outdir: outDir,
  naming: "worker.mjs",
  target: "browser",
  format: "esm",
});
if (!out.success) {
  console.error("[bundle-sqlocal-worker] failed:", out.logs);
  process.exit(1);
}

const sqliteDist = resolve(root, "node_modules/@sqlite.org/sqlite-wasm/dist");
for (const file of [
  "sqlite3.wasm",
  "sqlite3-opfs-async-proxy.js",
  "sqlite3-worker1.mjs",
]) {
  copyFileSync(resolve(sqliteDist, file), resolve(outDir, file));
}

console.log("[bundle-sqlocal-worker] OK");
