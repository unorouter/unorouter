import { Vendor } from "@/lib/types/enums";

export type VendorTheme = {
  bg: string;
  border: string;
  text: string;
  tagBg: string;
  tagBorder: string;
};

export const VENDOR_THEMES: Record<string, VendorTheme> = {
  [Vendor.OPENAI]: {
    bg: "bg-green-500/5",
    border: "border-green-500/20",
    text: "text-green-700 dark:text-green-400",
    tagBg: "bg-green-500/10",
    tagBorder: "border-green-500/20",
  },
  [Vendor.ANTHROPIC]: {
    bg: "bg-orange-500/5",
    border: "border-orange-500/20",
    text: "text-orange-700 dark:text-orange-400",
    tagBg: "bg-orange-500/10",
    tagBorder: "border-orange-500/20",
  },
  [Vendor.GOOGLE]: {
    bg: "bg-blue-500/5",
    border: "border-blue-500/20",
    text: "text-blue-700 dark:text-blue-400",
    tagBg: "bg-blue-500/10",
    tagBorder: "border-blue-500/20",
  },
  [Vendor.BAILIAN]: {
    bg: "bg-orange-500/5",
    border: "border-orange-500/20",
    text: "text-orange-600 dark:text-orange-300",
    tagBg: "bg-orange-500/10",
    tagBorder: "border-orange-500/20",
  },
  [Vendor.BYTEDANCE]: {
    bg: "bg-sky-500/5",
    border: "border-sky-500/20",
    text: "text-sky-700 dark:text-sky-400",
    tagBg: "bg-sky-500/10",
    tagBorder: "border-sky-500/20",
  },
  [Vendor.DEEPSEEK]: {
    bg: "bg-purple-500/5",
    border: "border-purple-500/20",
    text: "text-purple-700 dark:text-purple-400",
    tagBg: "bg-purple-500/10",
    tagBorder: "border-purple-500/20",
  },
  [Vendor.FLUX]: {
    bg: "bg-fuchsia-500/5",
    border: "border-fuchsia-500/20",
    text: "text-fuchsia-700 dark:text-fuchsia-400",
    tagBg: "bg-fuchsia-500/10",
    tagBorder: "border-fuchsia-500/20",
  },
  [Vendor.KLING]: {
    bg: "bg-violet-500/5",
    border: "border-violet-500/20",
    text: "text-violet-700 dark:text-violet-400",
    tagBg: "bg-violet-500/10",
    tagBorder: "border-violet-500/20",
  },
  [Vendor.META]: {
    bg: "bg-sky-500/5",
    border: "border-sky-500/20",
    text: "text-sky-700 dark:text-sky-400",
    tagBg: "bg-sky-500/10",
    tagBorder: "border-sky-500/20",
  },
  [Vendor.MISTRAL]: {
    bg: "bg-amber-500/5",
    border: "border-amber-500/20",
    text: "text-amber-700 dark:text-amber-400",
    tagBg: "bg-amber-500/10",
    tagBorder: "border-amber-500/20",
  },
  [Vendor.COHERE]: {
    bg: "bg-rose-500/5",
    border: "border-rose-500/20",
    text: "text-rose-700 dark:text-rose-400",
    tagBg: "bg-rose-500/10",
    tagBorder: "border-rose-500/20",
  },
  [Vendor.XAI]: {
    bg: "bg-zinc-500/5",
    border: "border-zinc-500/20",
    text: "text-zinc-700 dark:text-zinc-400",
    tagBg: "bg-zinc-500/10",
    tagBorder: "border-zinc-500/20",
  },
  [Vendor.MOONSHOT]: {
    bg: "bg-indigo-500/5",
    border: "border-indigo-500/20",
    text: "text-indigo-700 dark:text-indigo-400",
    tagBg: "bg-indigo-500/10",
    tagBorder: "border-indigo-500/20",
  },
  [Vendor.ZHIPU]: {
    bg: "bg-cyan-500/5",
    border: "border-cyan-500/20",
    text: "text-cyan-700 dark:text-cyan-400",
    tagBg: "bg-cyan-500/10",
    tagBorder: "border-cyan-500/20",
  },
  [Vendor.STABILITY]: {
    bg: "bg-purple-500/5",
    border: "border-purple-500/20",
    text: "text-purple-600 dark:text-purple-300",
    tagBg: "bg-purple-500/10",
    tagBorder: "border-purple-500/20",
  },
  [Vendor.XIAOMI]: {
    bg: "bg-orange-500/5",
    border: "border-orange-500/20",
    text: "text-orange-700 dark:text-orange-400",
    tagBg: "bg-orange-500/10",
    tagBorder: "border-orange-500/20",
  },
  [Vendor.MINIMAX]: {
    bg: "bg-violet-500/5",
    border: "border-violet-500/20",
    text: "text-violet-700 dark:text-violet-400",
    tagBg: "bg-violet-500/10",
    tagBorder: "border-violet-500/20",
  },
};

export const DEFAULT_THEME: VendorTheme = {
  bg: "bg-muted/30",
  border: "border-border",
  text: "text-muted-foreground",
  tagBg: "bg-secondary",
  tagBorder: "border-border",
};

export function getVendorTheme(vendor: string): VendorTheme {
  const normalized = vendor.toLowerCase();
  for (const [key, theme] of Object.entries(VENDOR_THEMES)) {
    if (normalized.includes(key)) return theme;
  }
  return DEFAULT_THEME;
}
