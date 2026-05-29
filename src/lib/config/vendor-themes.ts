import { Vendor } from "@/lib/types/enums";

export type VendorTheme = {
  bg: string;
  border: string;
  text: string;
  tagBg: string;
  tagBorder: string;
  /** Brand hex color for charts and non-Tailwind contexts. */
  primary?: string;
};

const VENDOR_THEMES: Record<string, VendorTheme> = {
  [Vendor.OPENAI]: {
    bg: "bg-green-500/5",
    border: "border-green-500/20",
    text: "text-green-700 dark:text-green-300",
    tagBg: "bg-green-500/10",
    tagBorder: "border-green-500/20",
    primary: "#10a37f",
  },
  [Vendor.ANTHROPIC]: {
    bg: "bg-orange-500/5",
    border: "border-orange-500/20",
    text: "text-orange-700 dark:text-orange-300",
    tagBg: "bg-orange-500/10",
    tagBorder: "border-orange-500/20",
    primary: "#d97757",
  },
  [Vendor.ARCEE]: {
    bg: "bg-teal-500/5",
    border: "border-teal-500/20",
    text: "text-teal-700 dark:text-teal-300",
    tagBg: "bg-teal-500/10",
    tagBorder: "border-teal-500/20",
    primary: "#008c8c",
  },
  [Vendor.GOOGLE]: {
    bg: "bg-blue-500/5",
    border: "border-blue-500/20",
    text: "text-blue-700 dark:text-blue-300",
    tagBg: "bg-blue-500/10",
    tagBorder: "border-blue-500/20",
    primary: "#4285f4",
  },
  [Vendor.ALIBABA]: {
    bg: "bg-yellow-500/5",
    border: "border-yellow-500/20",
    text: "text-yellow-700 dark:text-yellow-300",
    tagBg: "bg-yellow-500/10",
    tagBorder: "border-yellow-500/20",
    primary: "#ff9900",
  },
  [Vendor.BAILIAN]: {
    bg: "bg-orange-500/5",
    border: "border-orange-500/20",
    text: "text-orange-600 dark:text-orange-300",
    tagBg: "bg-orange-500/10",
    tagBorder: "border-orange-500/20",
    primary: "#f97316",
  },
  [Vendor.BYTEDANCE]: {
    bg: "bg-sky-500/5",
    border: "border-sky-500/20",
    text: "text-sky-700 dark:text-sky-300",
    tagBg: "bg-sky-500/10",
    tagBorder: "border-sky-500/20",
    primary: "#3b82f6",
  },
  [Vendor.DEEPSEEK]: {
    bg: "bg-purple-500/5",
    border: "border-purple-500/20",
    text: "text-purple-700 dark:text-purple-300",
    tagBg: "bg-purple-500/10",
    tagBorder: "border-purple-500/20",
    primary: "#7c5cff",
  },
  [Vendor.FLUX]: {
    bg: "bg-fuchsia-500/5",
    border: "border-fuchsia-500/20",
    text: "text-fuchsia-700 dark:text-fuchsia-300",
    tagBg: "bg-fuchsia-500/10",
    tagBorder: "border-fuchsia-500/20",
    primary: "#d946ef",
  },
  [Vendor.KLING]: {
    bg: "bg-violet-500/5",
    border: "border-violet-500/20",
    text: "text-violet-700 dark:text-violet-300",
    tagBg: "bg-violet-500/10",
    tagBorder: "border-violet-500/20",
    primary: "#8b5cf6",
  },
  [Vendor.META]: {
    bg: "bg-sky-500/5",
    border: "border-sky-500/20",
    text: "text-sky-700 dark:text-sky-300",
    tagBg: "bg-sky-500/10",
    tagBorder: "border-sky-500/20",
    primary: "#1877f2",
  },
  [Vendor.MISTRAL]: {
    bg: "bg-amber-500/5",
    border: "border-amber-500/20",
    text: "text-amber-700 dark:text-amber-300",
    tagBg: "bg-amber-500/10",
    tagBorder: "border-amber-500/20",
    primary: "#ff7000",
  },
  [Vendor.COHERE]: {
    bg: "bg-rose-500/5",
    border: "border-rose-500/20",
    text: "text-rose-700 dark:text-rose-300",
    tagBg: "bg-rose-500/10",
    tagBorder: "border-rose-500/20",
    primary: "#fb923c",
  },
  [Vendor.XAI]: {
    bg: "bg-zinc-500/5",
    border: "border-zinc-500/20",
    text: "text-zinc-700 dark:text-zinc-300",
    tagBg: "bg-zinc-500/10",
    tagBorder: "border-zinc-500/20",
    primary: "#1f2937",
  },
  [Vendor.MOONSHOT]: {
    bg: "bg-indigo-500/5",
    border: "border-indigo-500/20",
    text: "text-indigo-700 dark:text-indigo-300",
    tagBg: "bg-indigo-500/10",
    tagBorder: "border-indigo-500/20",
    primary: "#ec4899",
  },
  [Vendor.ZHIPU]: {
    bg: "bg-cyan-500/5",
    border: "border-cyan-500/20",
    text: "text-cyan-700 dark:text-cyan-300",
    tagBg: "bg-cyan-500/10",
    tagBorder: "border-cyan-500/20",
    primary: "#06b6d4",
  },
  [Vendor.STABILITY]: {
    bg: "bg-purple-500/5",
    border: "border-purple-500/20",
    text: "text-purple-600 dark:text-purple-300",
    tagBg: "bg-purple-500/10",
    tagBorder: "border-purple-500/20",
    primary: "#a855f7",
  },
  [Vendor.XIAOMI]: {
    bg: "bg-orange-500/5",
    border: "border-orange-500/20",
    text: "text-orange-700 dark:text-orange-300",
    tagBg: "bg-orange-500/10",
    tagBorder: "border-orange-500/20",
    primary: "#ff6900",
  },
  [Vendor.MINIMAX]: {
    bg: "bg-violet-500/5",
    border: "border-violet-500/20",
    text: "text-violet-700 dark:text-violet-300",
    tagBg: "bg-violet-500/10",
    tagBorder: "border-violet-500/20",
    primary: "#a855f7",
  },
  [Vendor.NVIDIA]: {
    bg: "bg-lime-500/5",
    border: "border-lime-500/20",
    text: "text-lime-700 dark:text-lime-300",
    tagBg: "bg-lime-500/10",
    tagBorder: "border-lime-500/20",
    primary: "#76b900",
  },
  [Vendor.TENCENT]: {
    bg: "bg-blue-500/5",
    border: "border-blue-500/20",
    text: "text-blue-700 dark:text-blue-300",
    tagBg: "bg-blue-500/10",
    tagBorder: "border-blue-500/20",
    primary: "#22c55e",
  },
  [Vendor.HUNYUAN]: {
    bg: "bg-blue-500/5",
    border: "border-blue-500/20",
    text: "text-blue-700 dark:text-blue-300",
    tagBg: "bg-blue-500/10",
    tagBorder: "border-blue-500/20",
    primary: "#3b82f6",
  },
  [Vendor.BAIDU]: {
    bg: "bg-indigo-500/5",
    border: "border-indigo-500/20",
    text: "text-indigo-700 dark:text-indigo-300",
    tagBg: "bg-indigo-500/10",
    tagBorder: "border-indigo-500/20",
    primary: "#ef4444",
  },
  [Vendor.QIANFAN]: {
    bg: "bg-indigo-500/5",
    border: "border-indigo-500/20",
    text: "text-indigo-700 dark:text-indigo-300",
    tagBg: "bg-indigo-500/10",
    tagBorder: "border-indigo-500/20",
    primary: "#6366f1",
  },
  [Vendor.LIQUID]: {
    bg: "bg-slate-500/5",
    border: "border-slate-500/20",
    text: "text-slate-700 dark:text-slate-300",
    tagBg: "bg-slate-500/10",
    tagBorder: "border-slate-500/20",
    primary: "#64748b",
  },
  [Vendor.INCLUSIONAI]: {
    bg: "bg-blue-500/5",
    border: "border-blue-500/20",
    text: "text-blue-600 dark:text-blue-300",
    tagBg: "bg-blue-500/10",
    tagBorder: "border-blue-500/20",
    primary: "#3b82f6",
  },
  [Vendor.LING]: {
    bg: "bg-blue-500/5",
    border: "border-blue-500/20",
    text: "text-blue-600 dark:text-blue-300",
    tagBg: "bg-blue-500/10",
    tagBorder: "border-blue-500/20",
    primary: "#3b82f6",
  },
};

export const DEFAULT_THEME: VendorTheme = {
  bg: "bg-muted/30",
  border: "border-border",
  text: "text-muted-foreground",
  tagBg: "bg-secondary",
  tagBorder: "border-border",
  primary: "#94a3b8",
};

export function getVendorTheme(vendor: string): VendorTheme {
  const normalized = vendor.toLowerCase();
  for (const [key, theme] of Object.entries(VENDOR_THEMES)) {
    if (normalized.includes(key)) return theme;
  }
  return DEFAULT_THEME;
}
