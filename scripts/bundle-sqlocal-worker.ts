#!/usr/bin/env bun
// Prebundle SQLocal's worker into /public/sqlocal so neither webpack nor
// Turbopack touches it. Required because both bundlers mangle the
// `new URL("./worker", import.meta.url)` pattern + can't honor SQLocal's
// module-worker contract (turbopack #79; webpack ships `importScripts` chunk
// loader into module workers). Run from `prebuild` + `postinstall`.
//
// Also copies sqlite3.wasm + sqlite3-opfs-async-proxy.js + sqlite3-worker1.mjs
// so the prebundled worker resolves them as siblings.
import { build } from "esbuild";
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const outDir = resolve(root, "public/sqlocal");
mkdirSync(outDir, { recursive: true });

await build({
  entryPoints: [resolve(root, "node_modules/sqlocal/dist/worker.js")],
  outfile: resolve(outDir, "worker.mjs"),
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
});

const sqliteDist = resolve(root, "node_modules/@sqlite.org/sqlite-wasm/dist");
for (const file of [
  "sqlite3.wasm",
  "sqlite3-opfs-async-proxy.js",
  "sqlite3-worker1.mjs",
]) {
  copyFileSync(resolve(sqliteDist, file), resolve(outDir, file));
}

console.log("[bundle-sqlocal-worker] OK");
