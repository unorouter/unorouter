#!/usr/bin/env bun
import { BLOG_REGISTRY, DOCS_REGISTRY } from "@/i18n/registry";
import { spawnSync } from "node:child_process";
import { log } from "node:console";
import { existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const SLUG_FILES: Record<string, readonly string[]> = {
  ...Object.fromEntries(DOCS_REGISTRY.map((d) => [d.slug, d.contentFiles])),
  ...Object.fromEntries(
    BLOG_REGISTRY.map((b) => [`blog/${b.slug}`, b.contentFiles]),
  ),
};

function gitLog(args: string[], paths: readonly string[]): string {
  const existing = paths.filter((p) => existsSync(resolve(process.cwd(), p)));
  if (!existing.length) return "";
  const result = spawnSync("git", ["log", ...args, "--", ...existing], {
    encoding: "utf8",
  });
  return result.status === 0 ? result.stdout.trim() : "";
}

function firstCommitDate(paths: readonly string[]): string | null {
  const out = gitLog(
    ["--diff-filter=A", "--follow", "--format=%aI"],
    paths,
  );
  if (!out) return null;
  return out.split("\n").filter(Boolean).sort()[0] ?? null;
}

function lastCommitDate(paths: readonly string[]): string | null {
  return gitLog(["-1", "--format=%aI"], paths) || null;
}

const now = new Date().toISOString();
const result: Record<string, { published: string; modified: string }> = {};

for (const [slug, paths] of Object.entries(SLUG_FILES)) {
  const published = firstCommitDate(paths) ?? now;
  const modified = lastCommitDate(paths) ?? published;
  result[slug] = { published, modified };
}

const outPath = resolve(process.cwd(), "public/seo-timestamps.json");
writeFileSync(outPath, JSON.stringify(result, null, 2) + "\n");

log(
  `[seo-timestamps] wrote ${Object.keys(result).length} entries → public/seo-timestamps.json`,
);
