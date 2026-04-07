"use client";

import { Vendor } from "@/lib/types/enums";
import {
  Anthropic,
  Bailian,
  ByteDance,
  Claude,
  Cohere,
  DeepSeek,
  Flux,
  Gemini,
  Google,
  Kling,
  Meta,
  Mistral,
  Moonshot,
  OpenAI,
  Stability,
  XAI,
  Zhipu,
} from "@lobehub/icons";
import type { FC } from "react";

type IconComponent = FC<{ size?: number | string; className?: string }>;

const ICON_MAP: Record<string, IconComponent> = {
  [Vendor.ANTHROPIC]: Anthropic,
  [Vendor.BAILIAN]: Bailian,
  [Vendor.BYTEDANCE]: ByteDance,
  claude: Claude,
  [Vendor.COHERE]: Cohere,
  [Vendor.DEEPSEEK]: DeepSeek,
  [Vendor.FLUX]: Flux,
  gemini: Gemini,
  [Vendor.GOOGLE]: Google,
  [Vendor.GOOGLE_DEEPMIND]: Google,
  [Vendor.KLING]: Kling,
  [Vendor.META]: Meta,
  [Vendor.MISTRAL]: Mistral,
  [Vendor.MISTRAL_AI]: Mistral,
  [Vendor.MOONSHOT]: Moonshot,
  [Vendor.OPENAI]: OpenAI,
  [Vendor.STABILITY]: Stability,
  [Vendor.XAI]: XAI,
  [Vendor.X_AI]: XAI,
  [Vendor.ZHIPU]: Zhipu,
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
