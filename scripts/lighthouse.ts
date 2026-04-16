#!/usr/bin/env bun
import { spawn } from "node:child_process";
import { log } from "node:console";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

type FormFactor = "mobile" | "desktop";
type Theme = "dark" | "light";

type Variant = {
  name: string;
  formFactor: FormFactor;
  theme: Theme;
  outDir: string;
  configPath: string;
};

const pathArg = process.argv[2] ?? "/en";
const site = "https://unorouter.ai";
const tmpDir = tmpdir();
const sharedCacheDir = path.join(tmpDir, ".unlighthouse");
const generatedConfigDir = path.join(tmpDir, ".unlighthouse-configs");

const formFactors: FormFactor[] = ["mobile", "desktop"];
const themes: Theme[] = ["dark", "light"];

const variants: Variant[] = formFactors.flatMap((ff) =>
  themes.map((t) => ({
    name: `${cap(ff)} ${cap(t)}`,
    formFactor: ff,
    theme: t,
    outDir: path.join(tmpDir, `.unlighthouse-${ff}-${t}`),
    configPath: path.join(generatedConfigDir, `${ff}-${t}.config.ts`),
  })),
);

function cap(s: string) {
  return s[0].toUpperCase() + s.slice(1);
}

function buildConfig(v: Variant) {
  const screen =
    v.formFactor === "mobile"
      ? {
          mobile: true,
          width: 375,
          height: 812,
          deviceScaleFactor: 2,
          disabled: false,
        }
      : {
          mobile: false,
          width: 1920,
          height: 1080,
          deviceScaleFactor: 1,
          disabled: false,
        };

  const config = {
    site,
    urls: [pathArg],
    lighthouseOptions: {
      formFactor: v.formFactor,
      screenEmulation: screen,
    },
  };

  return `const config = ${JSON.stringify(config, null, 2)};
config.hooks = {
  "puppeteer:before-goto": async (page) => {
    await page.emulateMediaFeatures([
      { name: "prefers-color-scheme", value: ${JSON.stringify(v.theme)} },
    ]);
    await page.evaluateOnNewDocument(
      (t) => { try { localStorage.setItem("theme", t); } catch {} },
      ${JSON.stringify(v.theme)},
    );
  },
};
export default config;
`;
}

function runVariant(v: Variant) {
  return new Promise<void>((resolve) => {
    const args = [
      "-y",
      "unlighthouse-ci",
      "--site",
      `${site}${pathArg}`,
      "--urls",
      pathArg,
      "--output-path",
      v.outDir,
      "--config",
      v.configPath,
    ];
    const child = spawn("npx", args, {
      stdio: "inherit",
      cwd: tmpDir,
      shell: process.platform === "win32",
    });
    child.on("exit", () => resolve());
  });
}

async function readScore(v: Variant) {
  const slug = pathArg.replace(/^\//, "").replace(/\/$/, "");
  const jsonPath = path.join(v.outDir, "reports", slug, "lighthouse.json");
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

log(`Auditing ${site}${pathArg} (4 variants in parallel)...`);
log(`Reports: ${tmpDir}/.unlighthouse-<form>-<theme>/reports/<slug>/lighthouse.json\n`);

// Wipe shared unlighthouse cache, generated configs, and per-variant leftovers
// so every run starts fresh. Stale reports from a crashed previous run can
// otherwise produce misleading numbers.
await Promise.all([
  rm(sharedCacheDir, { recursive: true, force: true }).catch(() => {}),
  rm(generatedConfigDir, { recursive: true, force: true }).catch(() => {}),
  ...variants.map((v) =>
    rm(v.outDir, { recursive: true, force: true }).catch(() => {}),
  ),
]);

await mkdir(generatedConfigDir, { recursive: true });
await Promise.all(
  variants.map((v) => writeFile(v.configPath, buildConfig(v), "utf8")),
);

await Promise.all(variants.map(runVariant));

const scores = await Promise.all(variants.map(readScore));

log("\n=== Results ===\n");
log(
  "Variant".padEnd(16) +
    "Perf".padStart(6) +
    "A11y".padStart(6) +
    "BP".padStart(6) +
    "SEO".padStart(6) +
    "  Overall",
);
log("-".repeat(50));
for (const s of scores) {
  const overall = Math.round((s.perf + s.a11y + s.bp + s.seo) / 4);
  log(
    s.name.padEnd(16) +
      String(s.perf).padStart(6) +
      String(s.a11y).padStart(6) +
      String(s.bp).padStart(6) +
      String(s.seo).padStart(6) +
      "  " +
      String(overall).padStart(6),
  );
}
