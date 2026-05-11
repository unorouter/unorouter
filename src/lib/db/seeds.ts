// Seed catalogs that get inserted after migrations on every startup. Each
// row uses ON CONFLICT DO NOTHING on its primary key so re-runs are
// idempotent and operator edits via SQL never get clobbered.
//
// To add a new seed: append to the relevant catalog array. To remove a
// row from production, delete the seed AND issue a one-off DELETE in the
// DB; this file's removal alone won't clean up rows that were already
// inserted.

import { error, log } from "console";
import { sql } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import {
  controlNetCatalog,
  embeddingCatalog,
  loraCatalog,
  upscalerCatalog,
} from "./schema";
import * as schema from "./schema";

type LoraSeed = typeof loraCatalog.$inferInsert;
type EmbeddingSeed = typeof embeddingCatalog.$inferInsert;
type UpscalerSeed = typeof upscalerCatalog.$inferInsert;
type ControlNetSeed = typeof controlNetCatalog.$inferInsert;

// LoRAs we staged on the RunPod network volume at /workspace/models/loras/.
// Filename must match the on-disk filename exactly — LoraLoader.lora_name is
// patched verbatim into the ComfyUI workflow by the new-api adapter.
const LORA_SEEDS: LoraSeed[] = [
  {
    id: "sinfully-stylish-bold-lighting",
    name: "Sinfully Stylish - Bold Lighting",
    source: "hf",
    sourceId: "Naznut/Pony_LORAs",
    filename: "Sinfully_Stylish_dramitic_bold_lighting.safetensors",
    baseModel: "sdxl",
    category: "style",
    defaultWeight: 0.8,
    description: "Cinematic bold lighting style. Pony XL.",
    nsfw: false,
    sortOrder: 10,
  },
  {
    id: "sinfully-stylish-pony-v02",
    name: "Sinfully Stylish - Pony v0.2",
    source: "hf",
    sourceId: "Naznut/Pony_LORAs",
    filename: "sinfully_stylish_PONY_0.2.safetensors",
    baseModel: "sdxl",
    category: "style",
    defaultWeight: 0.8,
    description: "Photoreal-leaning style enhancer for Pony XL.",
    nsfw: false,
    sortOrder: 20,
  },
  {
    id: "expressive-h",
    name: "Expressive H",
    source: "hf",
    sourceId: "Naznut/Pony_LORAs",
    filename: "Expressive_H-000001.safetensors",
    baseModel: "sdxl",
    category: "concept",
    defaultWeight: 0.7,
    description: "Expression intensifier. Boosts facial / pose expressiveness.",
    nsfw: true,
    sortOrder: 30,
  },
  {
    id: "wlop-style",
    name: "wlop style",
    source: "hf",
    sourceId: "SirVeggie/wlop-pony-lora",
    filename: "wlop-000018-pony.safetensors",
    baseModel: "sdxl",
    category: "style",
    defaultWeight: 0.7,
    description: "Painterly illustration style after wlop. Trained on Pony.",
    nsfw: false,
    sortOrder: 40,
  },
  {
    id: "jinx-arcane",
    name: "Jinx (Arcane)",
    source: "hf",
    sourceId: "Naznut/Pony_LORAs",
    filename: "jinx.safetensors",
    baseModel: "sdxl",
    category: "character",
    defaultWeight: 0.85,
    description: "Jinx character LoRA from Arcane.",
    nsfw: false,
    sortOrder: 50,
  },
];

// Built-in latent upscalers — these ship with ComfyUI itself (no file
// on the RunPod volume required). The 5 below are the only upscalers
// safely available right now. ESRGAN/SwinIR/DAT variants require
// `upscale_models/` files on the volume; operator adds those rows by
// hand (or extends this seed list) after staging the model files.
const UPSCALER_SEEDS: UpscalerSeed[] = [
  {
    id: "latent-bicubic-antialiased",
    name: "Latent (bicubic antialiased)",
    filename: "bicubic",
    category: "latent",
    nativeScale: 2,
    description:
      "Pure-latent upscale, smooth bicubic with antialiasing. No model file required; runs in VRAM on the same KSampler.",
    sortOrder: 10,
  },
  {
    id: "latent-nearest",
    name: "Latent (nearest)",
    filename: "nearest",
    category: "latent",
    nativeScale: 2,
    description: "Pure-latent upscale, hard nearest-neighbor. Fastest.",
    sortOrder: 20,
  },
  {
    id: "latent-nearest-exact",
    name: "Latent (nearest-exact)",
    filename: "nearest-exact",
    category: "latent",
    nativeScale: 2,
    description: "Latent nearest-exact. Preserves grid pixels.",
    sortOrder: 30,
  },
  {
    id: "lanczos",
    name: "Lanczos",
    filename: "lanczos",
    category: "latent",
    nativeScale: 2,
    description: "Lanczos resample. Sharper than bicubic, prone to ringing.",
    sortOrder: 40,
  },
  {
    id: "nearest",
    name: "Nearest",
    filename: "nearest-pixel",
    category: "latent",
    nativeScale: 2,
    description: "Pixel nearest-neighbor on the decoded image.",
    sortOrder: 50,
  },
  // ESRGAN entries staged on the volume at /workspace/models/upscale_models/.
  // Filename must match the on-disk filename exactly (case-sensitive, with
  // extension), the ComfyUI UpscaleModelLoader reads from that directory.
  {
    id: "realesrgan-4xplus",
    name: "R-ESRGAN 4x+",
    filename: "RealESRGAN_x4plus.pth",
    category: "esrgan",
    nativeScale: 4,
    description:
      "General-purpose 4x ESRGAN. Good first pick for photoreal upscales.",
    sortOrder: 100,
  },
  {
    id: "realesr-anime-videov3",
    name: "R-ESRGAN AnimeVideo v3",
    filename: "RealESR_AnimeVideoV3.pth",
    category: "esrgan",
    nativeScale: 4,
    description:
      "Anime / illustration specialist. Lighter than 6B but anime-tuned.",
    sortOrder: 110,
  },
  {
    id: "4x-ultrasharp",
    name: "4x UltraSharp",
    filename: "4x-UltraSharp.pth",
    category: "esrgan",
    nativeScale: 4,
    description:
      "Detail-preserving general upscaler. Stronger texture than R-ESRGAN.",
    sortOrder: 120,
  },
  {
    id: "4x-nmkd-siax-200k",
    name: "4x NMKD Siax 200k",
    filename: "4x_NMKD-Siax_200k.pth",
    category: "esrgan",
    nativeScale: 4,
    description: "Sharp photoreal upscaler. Strong on faces and skin.",
    sortOrder: 130,
  },
];

// Textual inversion embeddings staged on the volume at
// /workspace/models/embeddings/. The worker rewrites prompts to inject
// `(embedding:<filename>:<weight>) ` tokens (filename with extension —
// ComfyUI tokenizer errors on bare names when weighted).
const EMBEDDING_SEEDS: EmbeddingSeed[] = [
  {
    id: "easynegative",
    name: "EasyNegative",
    source: "hf",
    sourceId: "embed/EasyNegative",
    filename: "EasyNegative.safetensors",
    baseModel: "sdxl",
    category: "negative",
    description:
      "Canonical SDXL negative embedding. Cleans anatomy and reduces common artifacts when applied to the negative prompt.",
    nsfw: false,
    sortOrder: 10,
  },
];

// SDXL ControlNets staged on the volume at /workspace/models/controlnet/.
// xinsir variants chosen over the diffusers official ones (better quality
// at the same size, ~2.4 GB each).
const CONTROLNET_SEEDS: ControlNetSeed[] = [
  {
    id: "xinsir-depth-sdxl",
    name: "Depth (xinsir SDXL)",
    kind: "depth",
    baseModel: "sdxl",
    filename: "control-depth-sdxl.safetensors",
    description:
      "Depth-conditioned generation. Pair with a depth map (we autopreprocess from your reference image).",
    sortOrder: 10,
  },
  {
    id: "xinsir-canny-sdxl",
    name: "Canny (xinsir SDXL)",
    kind: "canny",
    baseModel: "sdxl",
    filename: "control-canny-sdxl.safetensors",
    description:
      "Edge-conditioned generation. Strong for line-art / silhouette preservation.",
    sortOrder: 20,
  },
  {
    id: "xinsir-openpose-sdxl",
    name: "OpenPose (xinsir SDXL)",
    kind: "openpose",
    baseModel: "sdxl",
    filename: "control-openpose-sdxl.safetensors",
    description: "Body / hand / face pose-conditioned generation.",
    sortOrder: 30,
  },
];

export async function runSeeds(
  db: LibSQLDatabase<typeof schema>,
): Promise<void> {
  // Seed each catalog independently. The size-check fast-path avoids
  // N-row INSERTs on every cold start once the seed list has been
  // applied at least once. ON CONFLICT DO NOTHING handles the rare
  // race where two concurrent processes both try to seed.
  await seedCatalog(db, "lora_catalog", LORA_SEEDS, async (row) => {
    const r = await db
      .insert(loraCatalog)
      .values(row)
      .onConflictDoNothing()
      .returning({ id: loraCatalog.id });
    return r.length > 0;
  }, () =>
    db.select({ n: sql<number>`count(*)` }).from(loraCatalog).then((r) => Number(r[0]?.n ?? 0)),
  );

  await seedCatalog(db, "upscaler_catalog", UPSCALER_SEEDS, async (row) => {
    const r = await db
      .insert(upscalerCatalog)
      .values(row)
      .onConflictDoNothing()
      .returning({ id: upscalerCatalog.id });
    return r.length > 0;
  }, () =>
    db.select({ n: sql<number>`count(*)` }).from(upscalerCatalog).then((r) => Number(r[0]?.n ?? 0)),
  );

  // Embeddings + ControlNets are intentionally empty seeds today. The
  // helper is still called so future seed-row additions work without
  // changing this function.
  await seedCatalog(db, "embedding_catalog", EMBEDDING_SEEDS, async (row) => {
    const r = await db
      .insert(embeddingCatalog)
      .values(row)
      .onConflictDoNothing()
      .returning({ id: embeddingCatalog.id });
    return r.length > 0;
  }, () =>
    db.select({ n: sql<number>`count(*)` }).from(embeddingCatalog).then((r) => Number(r[0]?.n ?? 0)),
  );

  await seedCatalog(db, "controlnet_catalog", CONTROLNET_SEEDS, async (row) => {
    const r = await db
      .insert(controlNetCatalog)
      .values(row)
      .onConflictDoNothing()
      .returning({ id: controlNetCatalog.id });
    return r.length > 0;
  }, () =>
    db.select({ n: sql<number>`count(*)` }).from(controlNetCatalog).then((r) => Number(r[0]?.n ?? 0)),
  );
}

async function seedCatalog<T>(
  _db: LibSQLDatabase<typeof schema>,
  label: string,
  seeds: T[],
  insertOne: (row: T) => Promise<boolean>,
  count: () => Promise<number>,
): Promise<void> {
  if (seeds.length === 0) return;
  try {
    if ((await count()) >= seeds.length) return;
  } catch {
    // Table missing or unreadable — let the inserts surface the error.
  }
  let inserted = 0;
  for (const row of seeds) {
    try {
      if (await insertOne(row)) inserted++;
    } catch (e) {
      error(`seed ${label} failed`, e);
    }
  }
  if (inserted > 0) log(`[seed] inserted ${inserted} ${label} rows`);
}
