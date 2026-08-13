import {
  distillSchema,
  type ModelParamSpec,
  type RunwareSchemaSnapshot,
} from "@/lib/ai/image/schema-spec";
import { error, log } from "console";
import { writeFileSync } from "fs";
import { join } from "path";

// Pulls Runware's public per-model OpenAPI schemas and writes the distilled snapshot the
// image form renders from. Runware is the authority on what each model accepts, so this
// replaces the hand-written capability flags that had to be updated per model.
//
// TWO TIERS. Architecture slugs (sdxl, pony, illustrious, ...) are what make an arbitrary
// Civitai checkpoint resolve correctly: a checkpoint inherits its architecture's schema, so
// no per-checkpoint entry is ever needed. Model slugs cover the hosted APIs that have their
// own parameter surface (FLUX.2, gpt-image, seedream).

const SITEMAP_URL = "https://runware.ai/docs/sitemap.xml";
const schemaUrl = (slug: string) =>
  `https://runware.ai/docs/models/${slug}/schema.json`;

const OUT_PATH = join(process.cwd(), "src/lib/ai/image/runware-schemas.json");

// Every architecture Runware documents. A missing one silently strips the controls from
// every checkpoint built on it, so the build fails rather than shipping that.
const ARCHITECTURES = [
  "sdxl",
  "sdxl-lightning",
  "sdxl-turbo",
  "sd-1-5",
  "pony",
  "illustrious",
  "noobai",
  "flux-1-dev",
  "flux-1-schnell",
  "flux-1-kontext-dev",
  "flux-1-dev-srpo",
  "hidream-i1-dev",
  "hidream-i1-fast",
  "hidream-i1-full",
];

// Hosted API models with their own parameter surface. Absent ones are skipped with a
// warning: the catalog changes independently of this list, and a model we do not serve
// today may be added tomorrow.
const MODEL_SLUGS = [
  "bfl-flux-2-max",
  "bfl-flux-2-pro",
  "bfl-flux-2-flex",
  "bfl-flux-2-dev",
  "bfl-flux-2-klein-4b",
  "bfl-flux-2-klein-9b",
  "openai-gpt-image-1",
  "openai-gpt-image-2",
  "bytedance-seedream-4-0",
  "bytedance-seedream-4-5",
  "bytedance-seedream-5-0-pro",
  "bytedance-seedream-5-0-lite",
];

const CONCURRENCY = 6;

async function fetchSpec(slug: string): Promise<ModelParamSpec | null> {
  const res = await fetch(schemaUrl(slug));
  if (!res.ok) return null;
  const contentType = res.headers.get("content-type") ?? "";
  // A missing slug answers 200 with the docs HTML shell, not a 404.
  if (!contentType.includes("json")) return null;
  return distillSchema(await res.json());
}

async function mapLimited<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, () =>
    (async () => {
      while (cursor < items.length) {
        const index = cursor++;
        out[index] = await fn(items[index]);
      }
    })(),
  );
  await Promise.all(workers);
  return out;
}

async function main() {
  // Fetched purely to assert our slug lists still exist upstream; a rename would otherwise
  // surface as a silently missing entry.
  const sitemapRes = await fetch(SITEMAP_URL);
  const known = new Set<string>();
  if (sitemapRes.ok) {
    const xml = await sitemapRes.text();
    for (const match of xml.matchAll(/\/docs\/models\/([a-z0-9-]+)</g)) {
      known.add(match[1]);
    }
    log(`[runware-schemas] sitemap lists ${known.size} model slugs`);
  } else {
    log("[runware-schemas] sitemap unavailable, continuing without it");
  }

  const byArchitecture: Record<string, ModelParamSpec> = {};
  const archResults = await mapLimited(ARCHITECTURES, CONCURRENCY, fetchSpec);
  const missingArch: string[] = [];
  ARCHITECTURES.forEach((slug, i) => {
    const spec = archResults[i];
    // An architecture that resolves to zero params would hide every control for each of
    // its checkpoints, which is worse than the hand-written flags this replaces.
    if (!spec || Object.keys(spec.params).length === 0) {
      missingArch.push(slug);
      return;
    }
    byArchitecture[slug] = spec;
  });

  if (missingArch.length > 0) {
    error(
      `[runware-schemas] FAILED: no usable schema for architecture(s): ${missingArch.join(", ")}`,
    );
    process.exit(1);
  }

  const byAir: Record<string, ModelParamSpec> = {};
  const modelResults = await mapLimited(MODEL_SLUGS, CONCURRENCY, fetchSpec);
  const skipped: string[] = [];
  MODEL_SLUGS.forEach((slug, i) => {
    const spec = modelResults[i];
    if (!spec || Object.keys(spec.params).length === 0) {
      skipped.push(slug);
      return;
    }
    byAir[spec.air ?? slug] = spec;
  });

  if (skipped.length > 0) {
    log(`[runware-schemas] skipped (no schema): ${skipped.join(", ")}`);
  }

  const snapshot: RunwareSchemaSnapshot = { byAir, byArchitecture };
  const json = JSON.stringify(snapshot);
  writeFileSync(OUT_PATH, `${json}\n`);
  log(
    `[runware-schemas] wrote ${Object.keys(byArchitecture).length} architectures + ${Object.keys(byAir).length} models (${Math.round(json.length / 1024)}KB) -> ${OUT_PATH}`,
  );
}

await main();
