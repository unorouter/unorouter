"use client";

import { analytics } from "@/lib/analytics";
import { createAgentPipeline, resolveAgent } from "@/lib/ai/agents/pipeline";
import { illustratorAgent } from "@/lib/ai/agents/builtin/illustrator/agent";
import type { AgentRuntime } from "@/lib/ai/agents/types";
import {
  isCustomModelId,
  parseCustomModelId,
} from "@/lib/ai/chat/custom-provider-id";
import { rpc } from "@/lib/rpc";
import { handleElysia, rec, uid } from "@/lib/utils/base";
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
import { resolveModelTargetFromStore } from "./resolve-model-target";

export type IllustratorConvSettings = {
  imageEnabled: boolean;
  utilityModel: string | null;
  utilityGroup: string | null;
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
  let refMediaIds: string[] = [];
  try {
    const parsed: unknown = JSON.parse(s.imageRefIds ?? "[]");
    if (Array.isArray(parsed)) {
      refMediaIds = parsed.filter((x): x is string => typeof x === "string");
    }
  } catch {}
  if (s.useCharAvatarRef ?? preset?.useCharAvatarRef) {
    const primary = await readPrimaryCharacter(convId);
    const avatarId = primary?.avatarMediaId;
    if (avatarId) refMediaIds = [avatarId, ...refMediaIds];
  }
  return {
    imageEnabled: !!(s.imageEnabled ?? preset?.imageEnabled),
    utilityModel: (s.utilityModel ?? preset?.utilityModel) || null,
    // A lane is only valid for the model it was pinned for, so it rides along
    // only when the preset also supplied that model.
    utilityGroup: (s.utilityModel ? null : preset?.utilityGroup) || null,
    defaultModel: s.defaultModel ?? null,
    promptInstruction:
      s.promptInstruction ?? preset?.promptInstruction ?? undefined,
    imageModel: (s.imageModel ?? preset?.imageModel) || null,
    imageGroup: (s.imageModel ? null : preset?.imageGroup) || null,
    imagePreview: !!(s.imagePreview ?? preset?.imagePreview),
    refMediaIds,
  };
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
      await import("@/lib/ai/chat/custom-image-gen");
    return generateCustomProviderImage(
      provider,
      parsed.modelKey,
      prompt,
      opts.refUrls ?? [],
    );
  }
  return handleElysia(
    await rpc.api.ai.chat["trigger-op"].imggen.post({
      prompt,
      model: opts.imageModel || undefined,
      group: opts.imageGroup || undefined,
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
      ? `data:${row.mimeType};base64,${row.dataBase64}`
      : row.r2Url;
    if (url) urls.push(url);
  }
  return urls;
}

function makeGenerateImage(
  convId: string,
  opts: {
    imageModel?: string | null;
    imageGroup?: string | null;
    refUrls?: string[];
  },
): NonNullable<AgentRuntime["generateImage"]> {
  return async (prompt) => {
    const img = await requestImggen(prompt, opts);
    if (!img) return null;
    await upsertLocalMedia({
      id: img.id,
      convId,
      mimeType: img.mimeType,
      sizeBytes: img.sizeBytes,
      dataBase64: img.dataBase64,
      r2Key: null,
      r2Url: null,
      width: img.width,
      height: img.height,
      promptText: prompt,
    });
    return {
      id: img.id,
      dataBase64: img.dataBase64,
      mimeType: img.mimeType,
      sizeBytes: img.sizeBytes,
      width: img.width,
      height: img.height,
    };
  };
}

export type IllustratorRunInput = {
  convId: string;
  messageId: string;
  taskId: string;
  responseText: string;
  utilityModel: string;
  utilityGroup?: string | null;
  promptInstruction?: string;
  imageModel?: string | null;
  imageGroup?: string | null;
  refMediaIds?: string[];
  reviewPrompt?: (prompt: string) => Promise<string | null>;
};

export async function runIllustrator(
  input: IllustratorRunInput,
): Promise<boolean> {
  const target = await resolveModelTargetFromStore(input.utilityModel);
  const refUrls = input.refMediaIds?.length
    ? await resolveRefUrls(input.refMediaIds)
    : [];
  const runtime: AgentRuntime = {
    listFreeModels: async () => [target.model],
    generate: target.deps.runUtilityLLM,
    generateImage: makeGenerateImage(input.convId, {
      imageModel: input.imageModel,
      imageGroup: input.imageGroup,
      refUrls,
    }),
  };
  const pipeline = createAgentPipeline(
    [
      resolveAgent(illustratorAgent, {
        imageEnabled: true,
        promptInstruction: input.promptInstruction,
        reviewPrompt: input.reviewPrompt,
      }),
    ],
    {
      apiKey: target.apiKey,
      convId: input.convId,
      model: target.model,
      recentMessages: [],
      lastUserText: null,
    },
    runtime,
  );
  const results = await pipeline.postGenerate(input.responseText);
  const image = results.find((r) => r.type === "inlay_image");
  if (image) {
    analytics.chat.imageGenerated({
      source: "auto",
      model: input.imageModel ?? "auto",
    });
  }

  const items = (await readLocalMessageItems(input.convId)) ?? [];
  const mine = items.filter((it) => it.messageId === input.messageId);
  const rewritten = mine
    .map((it) => {
      const isPlaceholder =
        it.type === "task" && rec(it.data)?.task_id === input.taskId;
      if (!isPlaceholder) return it;
      if (image && image.type === "inlay_image") {
        return {
          ...it,
          type: "text" as const,
          data: { text: `\n\n${image.token}` },
        };
      }
      return null; // gen failed/noop: drop the placeholder
    })
    .filter((it): it is NonNullable<typeof it> => it != null)
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
  if (image && image.type === "inlay_image") {
    const id = image.token.match(/\{\{inlay::([\w-]+)\}\}/)?.[1];
    if (id) invalidateInlay(id);
  }
  return !!image;
}
