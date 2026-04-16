#!/usr/bin/env bun
import { spawn } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";

type Variant = {
  name: string;
  config: string;
  outDir: string;
};

const path_arg = process.argv[2] ?? "/en";
const site = "https://unorouter.ai";
const scriptDir = path.dirname(new URL(import.meta.url).pathname);

const variants: Variant[] = [
  {
    name: "Mobile Dark",
    config: path.join(scriptDir, "mobile-dark.config.ts"),
    outDir: "/tmp/.unlighthouse-mobile-dark",
  },
  {
    name: "Mobile Light",
    config: path.join(scriptDir, "mobile-light.config.ts"),
    outDir: "/tmp/.unlighthouse-mobile-light",
  },
  {
    name: "Desktop Dark",
    config: path.join(scriptDir, "desktop-dark.config.ts"),
    outDir: "/tmp/.unlighthouse-desktop-dark",
  },
  {
    name: "Desktop Light",
    config: path.join(scriptDir, "desktop-light.config.ts"),
    outDir: "/tmp/.unlighthouse-desktop-light",
  },
];

function runVariant(v: Variant) {
  return new Promise<void>((resolve) => {
    rm(v.outDir, { recursive: true, force: true })
      .catch(() => {})
      .then(() => {
        const args = [
          "-y",
          "unlighthouse-ci",
          "--site",
          `${site}${path_arg}`,
          "--urls",
          path_arg,
          "--output-path",
          v.outDir,
          "--config",
          v.config,
        ];
        const child = spawn("npx", args, {
          stdio: "inherit",
          cwd: "/tmp",
        });
        child.on("exit", () => resolve());
      });
  });
}

async function readScore(v: Variant) {
  const slug = path_arg.replace(/^\//, "").replace(/\/$/, "");
  const jsonPath = path.join(
    v.outDir,
    "reports",
    slug,
    "lighthouse.json",
  );
  try {
    const raw = await readFile(jsonPath, "utf8");
    const d = JSON.parse(raw);
    const c = d.categories;
    return {
      name: v.name,
      perf: Math.round(c.performance.score * 100),
      a11y: Math.round(c.accessibility.score * 100),
      bp: Math.round(c["best-practices"].score * 100),
      seo: Math.round(c.seo.score * 100),
    };
  } catch {
    return { name: v.name, perf: 0, a11y: 0, bp: 0, seo: 0 };
  }
}

console.log(`Auditing ${site}${path_arg} (4 variants in parallel)...\n`);

await Promise.all(variants.map(runVariant));

const scores = await Promise.all(variants.map(readScore));

console.log("\n=== Results ===\n");
console.log(
  "Variant".padEnd(16) +
    "Perf".padStart(6) +
    "A11y".padStart(6) +
    "BP".padStart(6) +
    "SEO".padStart(6) +
    "  Overall",
);
console.log("-".repeat(50));
for (const s of scores) {
  const overall = Math.round((s.perf + s.a11y + s.bp + s.seo) / 4);
  console.log(
    s.name.padEnd(16) +
      String(s.perf).padStart(6) +
      String(s.a11y).padStart(6) +
      String(s.bp).padStart(6) +
      String(s.seo).padStart(6) +
      "  " +
      String(overall).padStart(6),
  );
}
