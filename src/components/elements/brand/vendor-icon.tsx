"use client";

import { Vendor } from "@/lib/types/enums";
import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { LuLoader } from "react-icons/lu";

type IconComponent = ComponentType<{
  size?: number | string;
  className?: string;
}>;
type Loader = () => Promise<{ default: IconComponent }>;

const LOADERS: Record<string, Loader> = {
  [Vendor.ALIBABA]: () => import("@lobehub/icons/es/AlibabaCloud"),
  [Vendor.ANTHROPIC]: () => import("@lobehub/icons/es/Anthropic"),
  [Vendor.BAIDU]: () => import("@lobehub/icons/es/Baidu"),
  [Vendor.BAILIAN]: () => import("@lobehub/icons/es/Bailian"),
  [Vendor.BYTEDANCE]: () => import("@lobehub/icons/es/ByteDance"),
  [Vendor.COHERE]: () => import("@lobehub/icons/es/Cohere"),
  [Vendor.DEEPSEEK]: () => import("@lobehub/icons/es/DeepSeek"),
  [Vendor.FLUX]: () => import("@lobehub/icons/es/Flux"),
  [Vendor.GOOGLE]: () => import("@lobehub/icons/es/Google"),
  [Vendor.GOOGLE_DEEPMIND]: () => import("@lobehub/icons/es/Google"),
  [Vendor.HUNYUAN]: () => import("@lobehub/icons/es/Hunyuan"),
  [Vendor.INCLUSIONAI]: () => import("@lobehub/icons/es/AntGroup"),
  [Vendor.KLING]: () => import("@lobehub/icons/es/Kling"),
  [Vendor.LING]: () => import("@lobehub/icons/es/AntGroup"),
  [Vendor.LIQUID]: () => import("@lobehub/icons/es/Liquid"),
  [Vendor.META]: () => import("@lobehub/icons/es/Meta"),
  [Vendor.MINIMAX]: () => import("@lobehub/icons/es/Minimax"),
  [Vendor.MISTRAL]: () => import("@lobehub/icons/es/Mistral"),
  [Vendor.MISTRAL_AI]: () => import("@lobehub/icons/es/Mistral"),
  [Vendor.MOONSHOT]: () => import("@lobehub/icons/es/Moonshot"),
  [Vendor.NVIDIA]: () => import("@lobehub/icons/es/Nvidia"),
  [Vendor.OPENAI]: () => import("@lobehub/icons/es/OpenAI"),
  [Vendor.QIANFAN]: () => import("@lobehub/icons/es/Baidu"),
  [Vendor.STABILITY]: () => import("@lobehub/icons/es/Stability"),
  [Vendor.TENCENT]: () => import("@lobehub/icons/es/Tencent"),
  [Vendor.XAI]: () => import("@lobehub/icons/es/XAI"),
  [Vendor.X_AI]: () => import("@lobehub/icons/es/XAI"),
  [Vendor.XIAOMI]: () => import("@lobehub/icons/es/XiaomiMiMo"),
  [Vendor.ZHIPU]: () => import("@lobehub/icons/es/Zhipu"),
  alibabacloud: () => import("@lobehub/icons/es/AlibabaCloud"),
  claude: () => import("@lobehub/icons/es/Claude"),
  doubao: () => import("@lobehub/icons/es/Doubao"),
  gemini: () => import("@lobehub/icons/es/Gemini"),
  nemotron: () => import("@lobehub/icons/es/Nvidia"),
};

const cache = new Map<string, IconComponent>();

function getIcon(vendor: string): IconComponent | null {
  const hit = cache.get(vendor);
  if (hit) return hit;

  const normalized = vendor.toLowerCase();
  const key = Object.keys(LOADERS).find((k) => normalized.includes(k));
  if (!key) return null;

  const Icon = dynamic(LOADERS[key], {
    ssr: false,
    loading: () => <LuLoader className="text-muted-foreground animate-spin" />,
  }) as IconComponent;
  cache.set(vendor, Icon);
  return Icon;
}

type VendorIconProps = {
  vendor: string;
  size?: number;
  className?: string;
};

export function VendorIcon(props: VendorIconProps) {
  const size = props.size ?? 20;
  // eslint-disable-next-line react-hooks/static-components -- icon component is cached in module-scope cache keyed by vendor, referentially stable across renders
  const Icon = getIcon(props.vendor);

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
      {/* eslint-disable-next-line react-hooks/static-components -- Icon is cached in module-scope cache, referentially stable */}
      <Icon size={size} />
    </span>
  );
}
