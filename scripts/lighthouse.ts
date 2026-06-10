#!/usr/bin/env bun
import { spawn, spawnSync } from "node:child_process";
import { log } from "node:console";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

type FormFactor = "mobile" | "desktop";
type Theme = "dark" | "light";

type Variant = {
  name: string;
  short: string;
  formFactor: FormFactor;
  theme: Theme;
  outDir: string;
  configPath: string;
};

// Usage: bun scripts/lighthouse.ts [path]
// No arg = audit every page below. With arg (e.g. /en/pricing) = single page.
const pathArg = process.argv[2];

const apiUrl = process.env.NEXT_PUBLIC_API_URL;
if (!apiUrl) throw new Error("NEXT_PUBLIC_API_URL is not set");
const apiHost = new URL(apiUrl);
const site = `${apiHost.protocol}//${apiHost.hostname.replace(/^api\./, "")}`;
const tmpDir = tmpdir();
const sharedCacheDir = path.join(tmpDir, ".unlighthouse");
const generatedConfigDir = path.join(tmpDir, ".unlighthouse-configs");

const LOCALE = "/en";

// One URL per page template. App pages (chat/playground) render for guests.
const STATIC_PAGES = [
  "/",
  "/pricing",
  "/models",
  "/rankings",
  "/blog",
  "/docs",
  "/privacy",
  "/terms",
  "/login",
  "/register",
  "/consent",
  "/status",
  "/offline",
  "/chat",
  "/chat/cards",
  "/chat/presets",
  "/playground",
];

// docs/[slug] guides share one template; one representative per render path.
// sillytavern = template, cc-switch = customComponent, claude-code = legacy static route.
const GUIDE_SLUGS = ["sillytavern", "cc-switch", "claude-code"];

// Guests redirect to /login on these; needs an auth cookie hook to be meaningful.
// const AUTH_PAGES = ["/dashboard", "/billing", "/settings", "/token", "/logs", "/affiliate"];

// models/[slug] and blog/[slug] share one template each; one sample covers it.
const MODEL_SAMPLES = 1;
const BLOG_SAMPLES = 1;

async function sitemapSamples(): Promise<string[]> {
  const res = await fetch(`${site}/sitemap.xml`);
  if (!res.ok) throw new Error(`sitemap fetch failed: ${res.status}`);
  const xml = await res.text();
  const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => new URL(m[1]).pathname)
    .filter((p) => p.startsWith(`${LOCALE}/`));
  const models = paths.filter((p) =>
    new RegExp(`^${LOCALE}/models/[^/]+$`).test(p),
  );
  const blogs = paths.filter((p) => new RegExp(`^${LOCALE}/blog/.+$`).test(p));
  return [...models.slice(0, MODEL_SAMPLES), ...blogs.slice(0, BLOG_SAMPLES)];
}

async function buildUrls(): Promise<string[]> {
  if (pathArg) return [pathArg];
  const fixed = [
    ...STATIC_PAGES.map((p) => (p === "/" ? LOCALE : `${LOCALE}${p}`)),
    ...GUIDE_SLUGS.map((s) => `${LOCALE}/docs/${s}`),
  ];
  return [...new Set([...fixed, ...(await sitemapSamples())])];
}

// Mobile by default; FORM_FACTORS=desktop or FORM_FACTORS=mobile,desktop overrides.
const formFactors: FormFactor[] = (process.env.FORM_FACTORS?.split(",") as
  | FormFactor[]
  | undefined) ?? ["mobile"];
const themes: Theme[] = ["dark", "light"];

const variants: Variant[] = formFactors.flatMap((ff) =>
  themes.map((t) => ({
    name: `${cap(ff)} ${cap(t)}`,
    short: `${ff === "mobile" ? "Mob" : "Dsk"}${t === "dark" ? "Drk" : "Lgt"}`,
    formFactor: ff,
    theme: t,
    outDir: path.join(tmpDir, `.unlighthouse-${ff}-${t}`),
    configPath: path.join(generatedConfigDir, `${ff}-${t}.config.ts`),
  })),
);

function cap(s: string) {
  return s[0].toUpperCase() + s.slice(1);
}

function buildConfig(v: Variant, urls: string[]) {
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
    urls,
    // Perf scores are CPU-sensitive; parallel chrome instances deflate them.
    puppeteerClusterMaxConcurrency: 2,
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

function runVariant(v: Variant, urls: string[]) {
  return new Promise<void>((resolve) => {
    const args = [
      "-y",
      "unlighthouse-ci",
      "--site",
      site,
      "--urls",
      urls.join(","),
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
    children.add(child);
    child.on("exit", () => {
      children.delete(child);
      resolve();
    });
  });
}

// Crashed/killed runs used to leak headless chromes (hundreds accumulated).
// Sweep strays at start, and take children + their browsers down with us.
const children = new Set<ReturnType<typeof spawn>>();

function killStrays() {
  // Interactive browsers are not headless; this only hits audit leftovers.
  spawnSync("pkill", ["-9", "-f", "unlighthouse"], { stdio: "ignore" });
  spawnSync("pkill", ["-9", "-f", "--", "--headless"], { stdio: "ignore" });
}

function shutdown() {
  for (const c of children) c.kill("SIGKILL");
  killStrays();
  process.exit(130);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

type Score = { perf: number; a11y: number; bp: number; seo: number } | null;

async function readScore(v: Variant, urlPath: string): Promise<Score> {
  const slug = urlPath.replace(/^\/+/, "").replace(/\/+$/, "");
  const jsonPath = path.join(
    v.outDir,
    "reports",
    ...slug.split("/"),
    "lighthouse.json",
  );
  try {
    const raw = await readFile(jsonPath, "utf8");
    const d = JSON.parse(raw);
    const c = d.categories;
    return {
      perf: Math.round(c.performance.score * 100),
      a11y: Math.round(c.accessibility.score * 100),
      bp: Math.round(c["best-practices"].score * 100),
      seo: Math.round(c.seo.score * 100),
    };
  } catch {
    return null;
  }
}

const urls = await buildUrls();

log(
  `Auditing ${urls.length} page(s) on ${site} (${variants.length} variants, sequential)...`,
);
for (const u of urls) log(`  ${u}`);
log(
  `\nReports: ${path.join(tmpDir, ".unlighthouse-<form>-<theme>", "reports", "<slug>", "lighthouse.json")}\n`,
);

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
  variants.map((v) => writeFile(v.configPath, buildConfig(v, urls), "utf8")),
);

killStrays();

// Sequential: concurrent variants skew perf scores via CPU contention.
for (const v of variants) await runVariant(v, urls);

killStrays();

const matrix = await Promise.all(
  variants.map((v) => Promise.all(urls.map((u) => readScore(v, u)))),
);

const pageCol = Math.max(4, ...urls.map((u) => u.length)) + 2;

log("\n=== Performance per variant (A11y/BP/SEO = min across variants) ===\n");
log(
  "Page".padEnd(pageCol) +
    variants.map((v) => v.short.padStart(7)).join("") +
    "A11y".padStart(7) +
    "BP".padStart(7) +
    "SEO".padStart(7),
);
log("-".repeat(pageCol + 7 * 7));

const offenders: string[] = [];
urls.forEach((u, i) => {
  const row = matrix.map((scores) => scores[i]);
  const fmt = (n: number | undefined) => String(n ?? "-").padStart(7);
  const min = (k: "a11y" | "bp" | "seo") => {
    const vals = row.filter((s): s is NonNullable<Score> => s != null);
    return vals.length ? Math.min(...vals.map((s) => s[k])) : undefined;
  };
  log(
    u.padEnd(pageCol) +
      row.map((s) => fmt(s?.perf)).join("") +
      fmt(min("a11y")) +
      fmt(min("bp")) +
      fmt(min("seo")),
  );
  if (row.some((s) => s == null || s.perf < 100)) offenders.push(u);
});

log(
  offenders.length
    ? `\n${offenders.length} page(s) below 100 perf (or missing report):\n${offenders.map((u) => `  ${u}`).join("\n")}`
    : "\nAll pages at 100 performance.",
);
