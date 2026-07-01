"use client";

// Client-side illustrator run: drives the in-chat image-gen agent in the POST-RESPONSE path WITHOUT
// blocking the reply (async-amend, the pattern all 3 reference clients use). The reply persists instantly
// with a `task` placeholder item (kind:"image"); this runs the agent (utility-model prompt-writer ->
// imgGen) then rewrites the placeholder to an `{{inlay::id}}` text item. Fully local - no server finalize
// route needed (unlike the video task), the bytes live in OPFS.
//
// The prompt-writer resolves the utility model through `resolveModelTarget`, so on a CUSTOM-PROVIDER chat it
// uses the user's own endpoint (target.deps.runUtilityLLM) - same resolver the live chat + dry-run use. The
// image itself always goes through OUR /trigger-op/imggen (image models are catalog-only; custom providers
// are text endpoints), so imgGen stays server-side regardless.

import { createAgentPipeline } from "@/lib/ai/agents/pipeline";
import { illustratorAgent } from "@/lib/ai/agents/builtin/illustrator/agent";
import type { AgentRuntime } from "@/lib/ai/agents/types";
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
import { readLocalPreset } from "@/lib/db/client/data/rp/rp";
import { resolveModelTargetFromStore } from "./resolve-model-target";

// The illustrator settings a chat resolves through the preset inheritance chain (conv override ?? preset
// default). refMediaIds already includes the char-avatar ref when useCharAvatarRef is on.
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
  } catch {
    // malformed imageRefIds: treat as no refs
  }
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

// One image via /trigger-op/imggen. Shared by the agent runtime and the regenerate dialog.
export async function requestImggen(
  prompt: string,
  opts: { imageModel?: string | null; refUrls?: string[] },
) {
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

// Reference media rows -> data: URIs (or R2 urls) the imggen endpoint accepts. Missing rows drop silently.
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

// imgGen reach (same as the start-trigger client op): POST /trigger-op/imggen -> bytes; persist media
// (with the written prompt for the verify/regenerate UI).
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
  // The placeholder task item id to rewrite (kind:"image").
  taskId: string;
  // Original assistant reply text (pre regex/Lua mutation) - the second LLM writes the prompt from this.
  responseText: string;
  // The model id for the prompt-writer (the conv's utilityModel ?? chat model). May be a custom:: id.
  utilityModel: string;
  promptInstruction?: string;
  // Illustrator image model (catalog id); null/absent = server auto-pick.
  imageModel?: string | null;
  // Reference media ids (per-chat uploads + optional char avatar), resolved to data: URIs here.
  refMediaIds?: string[];
  // Opt-in preview: shows the written prompt for edit/skip before generating.
  reviewPrompt?: (prompt: string) => Promise<string | null>;
};

// Run the agent, then AMEND: rewrite the placeholder task item to a text item with the inlay token (success)
// or drop it (failure/noop). Returns true when an image landed. Best-effort: any throw leaves the reply intact.
export async function runIllustrator(
  input: IllustratorRunInput,
): Promise<boolean> {
  // Resolve the utility model -> its deps/endpoint (custom-provider models hit the user's endpoint).
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
      // The resolved upstream model id (custom:: stripped) - what runUtilityLLM passes to the provider.
      model: target.model,
      recentMessages: [],
      lastUserText: null,
    },
    runtime,
  );
  const results = await pipeline.postGenerate(input.responseText);
  const image = results.find((r) => r.type === "inlay_image");

  // Rewrite the message items: replace the placeholder task with the inlay token (or remove it on miss).
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
    // Re-index contiguously: dropping the placeholder on a miss must not leave a sequenceIndex gap.
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
  return !!image;
}
