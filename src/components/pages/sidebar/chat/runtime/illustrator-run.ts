"use client";

import { analytics } from "@/lib/analytics";
import { createAgentPipeline } from "@/lib/ai/agents/pipeline";
import { illustratorAgent } from "@/lib/ai/agents/builtin/illustrator/agent";
import type { AgentRuntime } from "@/lib/ai/agents/types";
import {
  isCustomModelId,
  parseCustomModelId,
} from "@/lib/ai/chat/custom-provider-id";
import { rpc } from "@/lib/rpc";
import { handleElysia, uid } from "@/lib/utils/base";
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
import { chatStore, localUserIdAtom } from "@/store/chat-store";
import { resolveModelTargetFromStore } from "./resolve-model-target";

export type IllustratorConvSettings = {
  imageEnabled: boolean;
  utilityModel: string | null;
  defaultModel: string | null;
  promptInstruction: string | undefined;
  imageModel: string | null;
  imagePreview: boolean;
  refMediaIds: string[];
};

export async function resolveIllustratorSettings(
  userId: number,
  convId: string,
): Promise<IllustratorConvSettings | null> {
  const s = (await readLocalConversationSettings(userId, convId)) as {
    imageEnabled?: boolean | null;
    utilityModel?: string | null;
    defaultModel?: string | null;
    presetId?: string | null;
    promptInstruction?: string | null;
    imageModel?: string | null;
    imagePreview?: boolean | null;
    imageRefIds?: string | null;
    useCharAvatarRef?: boolean | null;
  } | null;
  if (!s) return null;
  const preset = s.presetId
    ? ((await readLocalPreset(userId, s.presetId)) as {
        imageEnabled?: boolean | null;
        utilityModel?: string | null;
        promptInstruction?: string | null;
        imageModel?: string | null;
        imagePreview?: boolean | null;
        useCharAvatarRef?: boolean | null;
      } | null)
    : null;
  let refMediaIds: string[] = [];
  try {
    const parsed = JSON.parse(s.imageRefIds ?? "[]") as unknown;
    if (Array.isArray(parsed)) {
      refMediaIds = parsed.filter((x): x is string => typeof x === "string");
    }
  } catch {}
  if (s.useCharAvatarRef ?? preset?.useCharAvatarRef) {
    const primary = await readPrimaryCharacter(userId, convId);
    const avatarId = (primary as { avatarMediaId?: string | null } | null)
      ?.avatarMediaId;
    if (avatarId) refMediaIds = [avatarId, ...refMediaIds];
  }
  return {
    imageEnabled: !!(s.imageEnabled ?? preset?.imageEnabled),
    utilityModel: (s.utilityModel ?? preset?.utilityModel) || null,
    defaultModel: s.defaultModel ?? null,
    promptInstruction:
      s.promptInstruction ?? preset?.promptInstruction ?? undefined,
    imageModel: (s.imageModel ?? preset?.imageModel) || null,
    imagePreview: !!(s.imagePreview ?? preset?.imagePreview),
    refMediaIds,
  };
}

export async function requestImggen(
  prompt: string,
  opts: { imageModel?: string | null; refUrls?: string[] },
) {
  if (opts.imageModel && isCustomModelId(opts.imageModel)) {
    const parsed = parseCustomModelId(opts.imageModel);
    if (!parsed) throw new Error("invalid custom model id");
    const userId = chatStore.get(localUserIdAtom);
    const provider = await readLocalCustomProvider(userId, parsed.providerId);
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
      references: opts.refUrls?.length
        ? opts.refUrls.map((url) => ({ url }))
        : undefined,
    }),
  );
}

export async function resolveRefUrls(
  userId: number,
  mediaIds: string[],
): Promise<string[]> {
  const urls: string[] = [];
  for (const id of mediaIds.slice(0, 6)) {
    const row = await readLocalMedia(userId, id);
    if (!row) continue;
    const url = row.dataBase64
      ? `data:${row.mimeType};base64,${row.dataBase64}`
      : row.r2Url;
    if (url) urls.push(url);
  }
  return urls;
}

function makeGenerateImage(
  userId: number,
  convId: string,
  opts: { imageModel?: string | null; refUrls?: string[] },
): NonNullable<AgentRuntime["generateImage"]> {
  return async (prompt) => {
    const img = await requestImggen(prompt, opts);
    if (!img) return null;
    await upsertLocalMedia(userId, {
      id: img.id,
      convId,
      mimeType: img.mimeType,
      sizeBytes: img.sizeBytes,
      dataBase64: img.dataBase64,
      r2Key: null,
      r2Url: null,
      promptText: prompt,
    });
    return {
      id: img.id,
      dataBase64: img.dataBase64,
      mimeType: img.mimeType,
      sizeBytes: img.sizeBytes,
    };
  };
}

export type IllustratorRunInput = {
  userId: number;
  convId: string;
  messageId: string;
  taskId: string;
  responseText: string;
  utilityModel: string;
  promptInstruction?: string;
  imageModel?: string | null;
  refMediaIds?: string[];
  reviewPrompt?: (prompt: string) => Promise<string | null>;
};

export async function runIllustrator(
  input: IllustratorRunInput,
): Promise<boolean> {
  const target = await resolveModelTargetFromStore(input.utilityModel);
  const refUrls = input.refMediaIds?.length
    ? await resolveRefUrls(input.userId, input.refMediaIds)
    : [];
  const runtime: AgentRuntime = {
    listFreeModels: async () => [target.model],
    generate: target.deps.runUtilityLLM,
    generateImage: makeGenerateImage(input.userId, input.convId, {
      imageModel: input.imageModel,
      refUrls,
    }),
  };
  const pipeline = createAgentPipeline(
    [
      {
        def: illustratorAgent,
        settings: {
          imageEnabled: true,
          promptInstruction: input.promptInstruction,
          reviewPrompt: input.reviewPrompt,
        },
      },
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

  const items = (await readLocalMessageItems(input.userId, input.convId)) ?? [];
  const mine = items.filter((it) => it.messageId === input.messageId);
  const rewritten = mine
    .map((it) => {
      const isPlaceholder =
        it.type === "task" &&
        (it.data as { task_id?: string })?.task_id === input.taskId;
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

  await replaceLocalMessageItems(input.userId, input.messageId, rewritten);
  // The placeholder rendered BEFORE the media row existed, so requestInlay may have cached
  // the resolved-empty marker for this id and, by design, never re-reads it. Without
  // dropping that entry the finished image stays blank until a reload.
  if (image && image.type === "inlay_image") {
    const id = image.token.match(/\{\{inlay::([\w-]+)\}\}/)?.[1];
    if (id) invalidateInlay(id);
  }
  return !!image;
}
