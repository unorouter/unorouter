"use client";

import { APP_VALUES } from "@/lib/config/constants";
import { WEBMCP_TOOLS } from "@/lib/config/webmcp-tools";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

type ToolHandler = (
  input: Record<string, unknown>,
) => Promise<{ content: Array<{ type: string; text: string }> }>;

type Tool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: ToolHandler;
  annotations?: { readOnlyHint?: boolean };
};

type ModelContext = {
  registerTool: (tool: Tool) => void | Promise<void>;
};

declare global {
  interface Navigator {
    modelContext?: ModelContext;
  }
}

export function WebMcpProvider() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations();

  useEffect(() => {
    const ctx = navigator.modelContext;
    if (!ctx) return;

    const localePrefix = `/${locale}`;

    const tools: Tool[] = WEBMCP_TOOLS.map((descriptor) => ({
      name: descriptor.name,
      description: t(descriptor.descriptionKey, APP_VALUES),
      inputSchema: descriptor.inputSchema,
      annotations: { readOnlyHint: descriptor.readOnly },
      execute: async (input) => {
        const result = descriptor.resolve(input);
        router.push(`${localePrefix}${result.path}`);
        const key = result.resultKey ?? descriptor.resultKey;
        const text = result.target
          ? t(key, { ...APP_VALUES, target: result.target })
          : t(key, APP_VALUES);
        return { content: [{ type: "text", text }] };
      },
    }));

    for (const tool of tools) {
      try {
        ctx.registerTool(tool);
      } catch {
        // Client does not support registerTool or rejected registration.
      }
    }
  }, [locale, router, t]);

  return null;
}
