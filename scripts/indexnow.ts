#!/usr/bin/env bun
// Submits only sitemap URLs that are new, changed (lastmod) or gone since the
// previous run; IndexNow treats resubmitting unchanged URLs as noise.
import { error, log } from "console";
import { existsSync, readFileSync, writeFileSync } from "fs";

const KEY = process.env.INDEXNOW_KEY;
const SITE_URL = process.env.NEXT_PUBLIC_URL;
const STATE_FILE = process.argv[2] ?? ".indexnow-state.json";
const BATCH = 10_000;

if (!KEY || !SITE_URL) {
  error("[IndexNow] INDEXNOW_KEY and NEXT_PUBLIC_URL are required");
  process.exit(1);
}

const res = await fetch(`${SITE_URL}/sitemap.xml`);
if (!res.ok) {
  error(`[IndexNow] sitemap answered ${res.status}`);
  process.exit(1);
}
const xml = await res.text();

const current: Record<string, string> = {};
for (const block of xml.match(/<url>[\s\S]*?<\/url>/g) ?? []) {
  const loc = block.match(/<loc>([^<]+)<\/loc>/)?.[1];
  if (loc) current[loc] = block.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1] ?? "";
}
const total = Object.keys(current).length;
// A shrunken sitemap would read as thousands of removals.
if (total < 1000) {
  error(`[IndexNow] sitemap has only ${total} URLs, refusing to diff`);
  process.exit(1);
}

const previous: Record<string, string> = existsSync(STATE_FILE)
  ? JSON.parse(readFileSync(STATE_FILE, "utf8"))
  : {};
const changed = Object.keys(current).filter((u) => previous[u] !== current[u]);
const removed = Object.keys(previous).filter((u) => !(u in current));
const urls = [...changed, ...removed];
log(
  `[IndexNow] sitemap ${total}, new or changed ${changed.length}, removed ${removed.length}`,
);

const host = new URL(SITE_URL).host;
for (let i = 0; i < urls.length; i += BATCH) {
  const urlList = urls.slice(i, i + BATCH);
  const r = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host,
      key: KEY,
      keyLocation: `${SITE_URL}/${KEY}.txt`,
      urlList,
    }),
  });
  log(`[IndexNow] batch of ${urlList.length}: ${r.status}`);
  if (r.status !== 200 && r.status !== 202) {
    error(await r.text());
    process.exit(1);
  }
}

writeFileSync(STATE_FILE, JSON.stringify(current));
