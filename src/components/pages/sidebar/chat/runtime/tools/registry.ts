"use client";

import { dynamicTool, jsonSchema, type ToolSet } from "ai";
import type { TSchema } from "@sinclair/typebox";
import type { TranslationKey } from "@/lib/config/constants";
import { fetchPageTool } from "./fetch-page";
import { createDocumentTool } from "./documents/create-document";
import { runPythonTool } from "./python/run-python";

export type ChatTool = {
  // Persisted in message items: renaming one orphans its stored calls.
  name: string;
  titleKey: TranslationKey;
  hintKey: TranslationKey;
  // Model-facing and cache-stable, so no dates or per-user text.
  description: string;
  input: TSchema;
  signedIn: boolean;
  execute: (input: unknown, ctx: ToolContext) => Promise<unknown>;
};

export type ToolContext = {
  convId: string | null;
  abortSignal?: AbortSignal;
};

// Sorted by name so the tool list sent upstream keeps its prompt-cache prefix.
export const CHAT_TOOLS: ChatTool[] = [
  fetchPageTool,
  createDocumentTool,
  runPythonTool,
].sort((a, b) => a.name.localeCompare(b.name));

export const MAX_TOOL_STEPS = 8;

export function buildToolSet(
  enabled: string[],
  signedIn: boolean,
  convId: string | null,
): ToolSet | undefined {
  const set: ToolSet = {};
  for (const tool of CHAT_TOOLS) {
    if (!enabled.includes(tool.name) || (tool.signedIn && !signedIn)) continue;
    set[tool.name] = dynamicTool({
      description: tool.description,
      inputSchema: jsonSchema(tool.input),
      execute: (input, options) =>
        tool.execute(input, { convId, abortSignal: options.abortSignal }),
    });
  }
  return Object.keys(set).length > 0 ? set : undefined;
}
