"use client";

import { Vendor } from "@/lib/types/enums";
import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { LuLoader } from "react-icons/lu";

type IconComponent = ComponentType<{ size?: number | string; className?: string }>;

type IconModule = { default: IconComponent & Record<string, IconComponent> };

type RawImport = () => Promise<unknown>;
const asIcon = (load: RawImport) => () => load() as Promise<IconModule>;

/** Static module loaders keyed by the upstream `icon` head (before any `.Color` suffix). Static imports keep the bundler from pulling in the whole @lobehub/icons tree. */
const MODULE_LOADERS: Record<string, () => Promise<IconModule>> = {
  AlibabaCloud: asIcon(() => import("@lobehub/icons/es/AlibabaCloud")),
  Anthropic: asIcon(() => import("@lobehub/icons/es/Anthropic")),
  Bailian: asIcon(() => import("@lobehub/icons/es/Bailian")),
  ByteDance: asIcon(() => import("@lobehub/icons/es/ByteDance")),
  Claude: asIcon(() => import("@lobehub/icons/es/Claude")),
  Cohere: asIcon(() => import("@lobehub/icons/es/Cohere")),
  DeepSeek: asIcon(() => import("@lobehub/icons/es/DeepSeek")),
  Doubao: asIcon(() => import("@lobehub/icons/es/Doubao")),
  Flux: asIcon(() => import("@lobehub/icons/es/Flux")),
  Gemini: asIcon(() => import("@lobehub/icons/es/Gemini")),
  Google: asIcon(() => import("@lobehub/icons/es/Google")),
  Kling: asIcon(() => import("@lobehub/icons/es/Kling")),
  Meta: asIcon(() => import("@lobehub/icons/es/Meta")),
  Minimax: asIcon(() => import("@lobehub/icons/es/Minimax")),
  Mistral: asIcon(() => import("@lobehub/icons/es/Mistral")),
  Moonshot: asIcon(() => import("@lobehub/icons/es/Moonshot")),
  OpenAI: asIcon(() => import("@lobehub/icons/es/OpenAI")),
  Stability: asIcon(() => import("@lobehub/icons/es/Stability")),
  XAI: asIcon(() => import("@lobehub/icons/es/XAI")),
  Xiaomi: asIcon(() => import("@lobehub/icons/es/XiaomiMiMo")),
  XiaomiMiMo: asIcon(() => import("@lobehub/icons/es/XiaomiMiMo")),
  Zhipu: asIcon(() => import("@lobehub/icons/es/Zhipu")),
};

/** Substring fallbacks for raw vendor names that aren't valid upstream `icon` strings (e.g. "google-deepmind", "x-ai"). */
const SUBSTRING_MAP: Record<string, keyof typeof MODULE_LOADERS> = {
  [Vendor.ANTHROPIC]: "Anthropic",
  [Vendor.BAILIAN]: "Bailian",
  [Vendor.BYTEDANCE]: "ByteDance",
  doubao: "Doubao",
  claude: "Claude",
  [Vendor.COHERE]: "Cohere",
  [Vendor.DEEPSEEK]: "DeepSeek",
  [Vendor.FLUX]: "Flux",
  gemini: "Gemini",
  [Vendor.GOOGLE]: "Google",
  [Vendor.GOOGLE_DEEPMIND]: "Google",
  [Vendor.KLING]: "Kling",
  [Vendor.META]: "Meta",
  [Vendor.MINIMAX]: "Minimax",
  [Vendor.MISTRAL]: "Mistral",
  [Vendor.MISTRAL_AI]: "Mistral",
  [Vendor.MOONSHOT]: "Moonshot",
  [Vendor.OPENAI]: "OpenAI",
  alibabacloud: "AlibabaCloud",
  [Vendor.STABILITY]: "Stability",
  [Vendor.XAI]: "XAI",
  [Vendor.X_AI]: "XAI",
  [Vendor.XIAOMI]: "XiaomiMiMo",
  [Vendor.ZHIPU]: "Zhipu",
};

const iconCache = new Map<string, IconComponent>();

type Loader = () => Promise<{ default: IconComponent }>;

function wrapLoader(
  moduleLoader: () => Promise<IconModule>,
  variant: string | undefined,
): Loader {
  return async () => {
    const imported = await moduleLoader();
    const Icon = variant ? imported.default[variant] : imported.default;
    return { default: (Icon ?? imported.default) as IconComponent };
  };
}

/** Resolves either "Doubao.Color" (direct module + subcomponent) or a vendor key like "bytedance" to a dynamic loader. */
function resolveLoader(vendor: string): Loader | null {
  const [head, sub] = vendor.split(".");
  if (head && MODULE_LOADERS[head]) {
    return wrapLoader(MODULE_LOADERS[head], sub);
  }

  const normalized = vendor.toLowerCase();
  for (const [key, moduleName] of Object.entries(SUBSTRING_MAP)) {
    if (normalized.includes(key)) {
      return wrapLoader(MODULE_LOADERS[moduleName], undefined);
    }
  }
  return null;
}

function getIcon(vendor: string, size: number): IconComponent | null {
  const key = `${vendor}:${size}`;
  const cached = iconCache.get(key);
  if (cached) return cached;

  const loader = resolveLoader(vendor);
  if (!loader) return null;

  const Icon = dynamic(loader, {
    ssr: false,
    loading: () => (
      <LuLoader
        size={size}
        className="text-muted-foreground animate-spin"
      />
    ),
  }) as IconComponent;

  iconCache.set(key, Icon);
  return Icon;
}

type VendorIconProps = {
  vendor: string;
  size?: number;
  className?: string;
};

export function VendorIcon(props: VendorIconProps) {
  const size = props.size ?? 20;
  // eslint-disable-next-line react-hooks/static-components -- icon component is cached in module-scope iconCache keyed by (vendor, size), so it is referentially stable across renders
  const Icon = getIcon(props.vendor, size);

  if (!Icon) {
    return (
      <span
        className={`bg-muted text-muted-foreground inline-flex shrink-0 items-center justify-center rounded font-mono text-[10px] font-bold ${props.className ?? ""}`}
        style={{ width: size, height: size }}
      >
        {props.vendor.charAt(0).toUpperCase()}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${props.className ?? ""}`}
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line react-hooks/static-components -- Icon is cached in module-scope iconCache, referentially stable */}
      <Icon size={size} />
    </span>
  );
}
