"use client";

import {
  isCustomModelId,
  parseCustomModelId,
} from "@/lib/ai/chat/custom-provider-id";
import { CUSTOM_CIVITAI_MODEL_ID, isValidAir } from "@/lib/ai/image/constants";
import { rpc } from "@/lib/rpc";
import {
  base64ToDataUri,
  base64ToUint8,
  handleElysia,
  parseDataUri,
  rec,
  jsonArray,
  uid,
} from "@/lib/utils/base";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import type { InlayImage } from "@/lib/ai/chat/pipeline/deps";
import {
  readLocalMedia,
  upsertLocalMedia,
} from "@/lib/db/client/data/media/media";
import {
  readLocalConversationSettings,
  readLocalMessageItems,
  readPrimaryCharacter,
  replaceLocalMessageItems,
} from "@/lib/db/client/data/chat/chat";
import { invalidateInlay } from "@/lib/db/client/data/media/inlay-render";
import { readLocalCustomProvider } from "@/lib/db/client/data/rp/custom-providers";
import { readLocalPreset } from "@/lib/db/client/data/rp/rp";
import { resolveModelTarget } from "@/components/pages/sidebar/chat/runtime/transport/resolve-model-target";

export type IllustratorConvSettings = {
  imageEnabled: boolean;
  utilityModel: string | null;
  defaultModel: string | null;
  promptInstruction: string | undefined;
  imageModel: string | null;
  imageGroup: string | null;
  imagePreview: boolean;
  refMediaIds: string[];
};

export async function resolveIllustratorSettings(
  convId: string,
): Promise<IllustratorConvSettings | null> {
  const s = await readLocalConversationSettings(convId);
  if (!s) return null;
  const preset = s.presetId ? await readLocalPreset(s.presetId) : null;
  let refMediaIds = jsonArray(s.imageRefIds).filter(
    (x) => typeof x === "string",
  );
  if (s.useCharAvatarRef ?? preset?.useCharAvatarRef) {
    const primary = await readPrimaryCharacter(convId);
    const avatarId = primary?.avatarMediaId;
    if (avatarId) refMediaIds = [avatarId, ...refMediaIds];
  }
  return {
    imageEnabled: !!(s.imageEnabled ?? preset?.imageEnabled),
    utilityModel: (s.utilityModel ?? preset?.utilityModel) || null,
    defaultModel: s.defaultModel ?? null,
    promptInstruction:
      s.promptInstruction ?? preset?.promptInstruction ?? undefined,
    imageModel: (s.imageModel ?? preset?.imageModel) || null,
    imageGroup: (s.imageModel ? null : preset?.imageGroup) || null,
    imagePreview: !!(s.imagePreview ?? preset?.imagePreview),
    refMediaIds,
  };
}

const TASK_POLL_MS = 5_000;
// A free community queue: a job can sit behind others for minutes.
const TASK_TIMEOUT_MS = 10 * 60_000;

async function isTaskImageModel(model: string): Promise<boolean> {
  // Unwrapped like useTaskImageModelsQuery, which shares this key.
  const models = await getQueryClient().query({
    queryKey: queryKeys.pricingTaskImageModels(),
    queryFn: async () =>
      handleElysia(await rpc.api.models.pricing["task-image-models"].get()),
    staleTime: 5 * 60 * 1000,
  });
  return models.some((m) => m.model_name === model);
}

// Polled from the browser: one server request would outlive the edge's limit.
async function generateTaskImage(
  prompt: string,
  model: string,
  group?: string | null,
): Promise<InlayImage> {
  const task = handleElysia(
    await rpc.api.ai.chat["trigger-op"].imgtask.post({
      prompt,
      model,
      group: group || undefined,
    }),
  );
  const deadline = Date.now() + TASK_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, TASK_POLL_MS));
    const state = handleElysia(
      await rpc.api.ai.chat.task({ taskId: task.taskId }).get(),
    );
    if (state.status === "FAILURE") {
      throw new Error(state.failReason ?? "image task failed");
    }
    if (state.status !== "SUCCESS" || !state.resultUrl) continue;
    const done = handleElysia(
      await rpc.api.ai.chat.task.finalize.post({ taskId: task.taskId }),
    );
    const data = parseDataUri(done.url);
    if (!data) throw new Error("image task returned no image");
    return {
      id: uid(),
      dataBase64: data.base64,
      mimeType: data.mime,
      sizeBytes: base64ToUint8(data.base64).byteLength,
      width: null,
      height: null,
    };
  }
  throw new Error("image task timed out");
}

export async function requestImggen(
  prompt: string,
  opts: {
    imageModel?: string | null;
    imageGroup?: string | null;
    refUrls?: string[];
  },
) {
  if (opts.imageModel && isCustomModelId(opts.imageModel)) {
    const parsed = parseCustomModelId(opts.imageModel);
    if (!parsed) throw new Error("invalid custom model id");
    const provider = await readLocalCustomProvider(parsed.providerId);
    if (!provider) throw new Error("custom provider not found");
    const { generateCustomProviderImage } =
      await import("@/components/pages/sidebar/chat/illustrator/custom-image-gen");
    return generateCustomProviderImage(
      provider,
      parsed.modelKey,
      prompt,
      opts.refUrls ?? [],
    );
  }
  const air = isValidAir(opts.imageModel) ? opts.imageModel : undefined;
  if (!air && opts.imageModel && (await isTaskImageModel(opts.imageModel))) {
    return generateTaskImage(prompt, opts.imageModel, opts.imageGroup);
  }
  return handleElysia(
    await rpc.api.ai.chat["trigger-op"].imggen.post({
      prompt,
      model: air ? CUSTOM_CIVITAI_MODEL_ID : opts.imageModel || undefined,
      group: (!air && opts.imageGroup) || undefined,
      air,
      references: opts.refUrls?.length
        ? opts.refUrls.map((url) => ({ url }))
        : undefined,
    }),
  );
}

export async function resolveRefUrls(mediaIds: string[]): Promise<string[]> {
  const urls: string[] = [];
  for (const id of mediaIds.slice(0, 6)) {
    const row = await readLocalMedia(id);
    if (!row) continue;
    const url = row.dataBase64
      ? base64ToDataUri(row.dataBase64, row.mimeType)
      : row.r2Url;
    if (url) urls.push(url);
  }
  return urls;
}

const DEFAULT_INSTRUCTION =
  "You write image-generation prompts. Given the latest roleplay response, write a single concise, " +
  "vivid image prompt describing the current scene (subjects, setting, lighting, mood, composition). " +
  "Output ONLY the prompt text, no preamble, no quotes.";

async function writeImagePrompt(input: IllustratorRunInput) {
  const target = await resolveModelTarget(input.utilityModel);
  try {
    const result = await target.deps.runUtilityLLM(target.model, {
      systemPrompt: input.promptInstruction ?? DEFAULT_INSTRUCTION,
      prompt: input.responseText,
      maxOutputTokens: 200,
    });
    const prompt = result.text.trim();
    if (!prompt || !input.reviewPrompt) return prompt || null;
    return (await input.reviewPrompt(prompt))?.trim() || null;
  } catch {
    return null;
  }
}

type IllustratorRunInput = {
  convId: string;
  messageId: string;
  taskId: string;
  responseText: string;
  utilityModel: string;
  promptInstruction?: string;
  imageModel?: string | null;
  imageGroup?: string | null;
  refMediaIds?: string[];
  reviewPrompt?: (prompt: string) => Promise<string | null>;
};

export async function runIllustrator(
  input: IllustratorRunInput,
): Promise<boolean> {
  const prompt = input.responseText.trim()
    ? await writeImagePrompt(input)
    : null;
  let imageError: unknown;
  let image: InlayImage | null = null;
  if (prompt) {
    try {
      image = await requestImggen(prompt, {
        imageModel: input.imageModel,
        imageGroup: input.imageGroup,
        refUrls: input.refMediaIds?.length
          ? await resolveRefUrls(input.refMediaIds)
          : [],
      });
      if (image)
        await upsertLocalMedia({
          id: image.id,
          convId: input.convId,
          mimeType: image.mimeType,
          sizeBytes: image.sizeBytes,
          dataBase64: image.dataBase64,
          r2Key: null,
          r2Url: null,
          width: image.width,
          height: image.height,
          promptText: prompt,
        });
    } catch (err) {
      imageError = err;
      image = null;
    }
  }

  const items = (await readLocalMessageItems(input.convId)) ?? [];
  const mine = items.filter((it) => it.messageId === input.messageId);
  const rewritten = mine
    .flatMap((it) => {
      const isPlaceholder =
        it.type === "task" && rec(it.data)?.task_id === input.taskId;
      if (!isPlaceholder) return [it];
      if (image) {
        return [
          {
            ...it,
            type: "text" as const,
            data: { text: `\n\n{{inlay::${image.id}}}` },
          },
        ];
      }
      return []; // gen failed/noop: drop the placeholder
    })
    .map((it, seq) => ({
      id: it.id ?? uid(),
      messageId: input.messageId,
      sequenceIndex: seq,
      outputIndex: it.outputIndex ?? null,
      type: it.type,
      data: it.data,
      createdAt: it.createdAt,
    }));

  await replaceLocalMessageItems(input.messageId, rewritten);
  // The placeholder rendered BEFORE the media row existed, so requestInlay may have cached
  // the resolved-empty marker for this id and, by design, never re-reads it. Without
  // dropping that entry the finished image stays blank until a reload.
  if (image) invalidateInlay(image.id);
  if (imageError) throw imageError;
  return !!image;
}
