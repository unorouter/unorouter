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
import { upsertLocalMedia } from "@/lib/db/client/data/media/media";
import {
  readLocalMessageItems,
  replaceLocalMessageItems,
} from "@/lib/db/client/data/chat/chat";
import { resolveModelTargetFromStore } from "./resolve-model-target";

// imgGen reach (same as the start-trigger client op): POST /trigger-op/imggen -> bytes; persist media.
function makeGenerateImage(
  userId: number,
  convId: string,
): NonNullable<AgentRuntime["generateImage"]> {
  return async (prompt) => {
    const img = handleElysia(
      await rpc.api.ai.chat["trigger-op"].imggen.post({ prompt }),
    );
    if (!img) return null;
    await upsertLocalMedia(userId, {
      id: img.id,
      convId,
      mimeType: img.mimeType,
      sizeBytes: img.sizeBytes,
      dataBase64: img.dataBase64,
      r2Key: null,
      r2Url: null,
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
};

// Run the agent, then AMEND: rewrite the placeholder task item to a text item with the inlay token (success)
// or drop it (failure/noop). Returns true when an image landed. Best-effort: any throw leaves the reply intact.
export async function runIllustrator(
  input: IllustratorRunInput,
): Promise<boolean> {
  // Resolve the utility model -> its deps/endpoint (custom-provider models hit the user's endpoint).
  const target = await resolveModelTargetFromStore(input.utilityModel);
  const runtime: AgentRuntime = {
    listFreeModels: async () => [target.model],
    generate: target.deps.runUtilityLLM,
    generateImage: makeGenerateImage(input.userId, input.convId),
  };
  const pipeline = createAgentPipeline(
    [
      {
        def: illustratorAgent,
        settings: {
          imageEnabled: true,
          promptInstruction: input.promptInstruction,
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
