"use client";

import {
  Anthropic,
  Claude,
  Google,
  Gemini,
  OpenAI,
  Moonshot,
  DeepSeek,
  Meta,
  Mistral,
  Cohere,
  XAI,
} from "@lobehub/icons";
import type { FC } from "react";

type IconComponent = FC<{ size?: number | string; className?: string }>;

const ICON_MAP: Record<string, IconComponent> = {
  anthropic: Anthropic,
  claude: Claude,
  google: Google,
  "google deepmind": Google,
  gemini: Gemini,
  openai: OpenAI,
  moonshot: Moonshot,
  deepseek: DeepSeek,
  meta: Meta,
  mistral: Mistral,
  "mistral ai": Mistral,
  cohere: Cohere,
  xai: XAI,
  "x.ai": XAI,
};

function resolveIcon(vendor: string): IconComponent | null {
  const normalized = vendor.toLowerCase();
  for (const [key, icon] of Object.entries(ICON_MAP)) {
    if (normalized.includes(key)) return icon;
  }
  return null;
}

type VendorIconProps = {
  vendor: string;
  size?: number;
  className?: string;
};

export function VendorIcon(props: VendorIconProps) {
  const Icon = resolveIcon(props.vendor);

  if (!Icon) {
    return (
      <span
        className={`bg-muted text-muted-foreground inline-flex items-center justify-center rounded font-mono text-[10px] font-bold ${props.className ?? ""}`}
        style={{ width: props.size ?? 20, height: props.size ?? 20 }}
      >
        {props.vendor.charAt(0).toUpperCase()}
      </span>
    );
  }

  return <Icon size={props.size ?? 20} className={props.className} />;
}
