"use client";

import { Vendor } from "@/lib/types/enums";
import dynamic from "next/dynamic";
import type { ComponentType } from "react";

type IconComponent = ComponentType<{ size?: number | string; className?: string }>;

const LOADER_MAP: Record<string, () => Promise<{ default: IconComponent }>> = {
  [Vendor.ANTHROPIC]: () => import("@lobehub/icons/es/Anthropic"),
  [Vendor.BAILIAN]: () => import("@lobehub/icons/es/Bailian"),
  [Vendor.BYTEDANCE]: () => import("@lobehub/icons/es/ByteDance"),
  claude: () => import("@lobehub/icons/es/Claude"),
  [Vendor.COHERE]: () => import("@lobehub/icons/es/Cohere"),
  [Vendor.DEEPSEEK]: () => import("@lobehub/icons/es/DeepSeek"),
  [Vendor.FLUX]: () => import("@lobehub/icons/es/Flux"),
  gemini: () => import("@lobehub/icons/es/Gemini"),
  [Vendor.GOOGLE]: () => import("@lobehub/icons/es/Google"),
  [Vendor.GOOGLE_DEEPMIND]: () => import("@lobehub/icons/es/Google"),
  [Vendor.KLING]: () => import("@lobehub/icons/es/Kling"),
  [Vendor.META]: () => import("@lobehub/icons/es/Meta"),
  [Vendor.MINIMAX]: () => import("@lobehub/icons/es/Minimax"),
  [Vendor.MISTRAL]: () => import("@lobehub/icons/es/Mistral"),
  [Vendor.MISTRAL_AI]: () => import("@lobehub/icons/es/Mistral"),
  [Vendor.MOONSHOT]: () => import("@lobehub/icons/es/Moonshot"),
  [Vendor.OPENAI]: () => import("@lobehub/icons/es/OpenAI"),
  [Vendor.STABILITY]: () => import("@lobehub/icons/es/Stability"),
  [Vendor.XAI]: () => import("@lobehub/icons/es/XAI"),
  [Vendor.X_AI]: () => import("@lobehub/icons/es/XAI"),
  [Vendor.XIAOMI]: () => import("@lobehub/icons/es/XiaomiMiMo"),
  [Vendor.ZHIPU]: () => import("@lobehub/icons/es/Zhipu"),
};

const iconCache = new Map<string, IconComponent>();

function resolveLoader(vendor: string): (() => Promise<{ default: IconComponent }>) | null {
  const normalized = vendor.toLowerCase();
  for (const [key, loader] of Object.entries(LOADER_MAP)) {
    if (normalized.includes(key)) return loader;
  }
  return null;
}

function getIcon(vendor: string): IconComponent | null {
  const cached = iconCache.get(vendor);
  if (cached) return cached;

  const loader = resolveLoader(vendor);
  if (!loader) return null;

  const Icon = dynamic(loader, {
    ssr: false,
    loading: () => (
      <span style={{ width: 16, height: 16, display: "inline-block" }} />
    ),
  }) as IconComponent;

  iconCache.set(vendor, Icon);
  return Icon;
}

type VendorIconProps = {
  vendor: string;
  size?: number;
  className?: string;
};

export function VendorIcon(props: VendorIconProps) {
  const Icon = getIcon(props.vendor);

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
