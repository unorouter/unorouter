export type VendorTheme = {
  bg: string;
  border: string;
  text: string;
  tagBg: string;
};

export const VENDOR_THEMES: Record<string, VendorTheme> = {
  openai: {
    bg: "bg-green-500/5",
    border: "border-green-500/20",
    text: "text-green-400",
    tagBg: "bg-green-500/10",
  },
  anthropic: {
    bg: "bg-orange-500/5",
    border: "border-orange-500/20",
    text: "text-orange-400",
    tagBg: "bg-orange-500/10",
  },
  google: {
    bg: "bg-blue-500/5",
    border: "border-blue-500/20",
    text: "text-blue-400",
    tagBg: "bg-blue-500/10",
  },
  "google deepmind": {
    bg: "bg-blue-500/5",
    border: "border-blue-500/20",
    text: "text-blue-400",
    tagBg: "bg-blue-500/10",
  },
  deepseek: {
    bg: "bg-purple-500/5",
    border: "border-purple-500/20",
    text: "text-purple-400",
    tagBg: "bg-purple-500/10",
  },
  meta: {
    bg: "bg-sky-500/5",
    border: "border-sky-500/20",
    text: "text-sky-400",
    tagBg: "bg-sky-500/10",
  },
  mistral: {
    bg: "bg-amber-500/5",
    border: "border-amber-500/20",
    text: "text-amber-400",
    tagBg: "bg-amber-500/10",
  },
  "mistral ai": {
    bg: "bg-amber-500/5",
    border: "border-amber-500/20",
    text: "text-amber-400",
    tagBg: "bg-amber-500/10",
  },
  cohere: {
    bg: "bg-rose-500/5",
    border: "border-rose-500/20",
    text: "text-rose-400",
    tagBg: "bg-rose-500/10",
  },
  xai: {
    bg: "bg-zinc-500/5",
    border: "border-zinc-500/20",
    text: "text-zinc-400",
    tagBg: "bg-zinc-500/10",
  },
  "x.ai": {
    bg: "bg-zinc-500/5",
    border: "border-zinc-500/20",
    text: "text-zinc-400",
    tagBg: "bg-zinc-500/10",
  },
  moonshot: {
    bg: "bg-indigo-500/5",
    border: "border-indigo-500/20",
    text: "text-indigo-400",
    tagBg: "bg-indigo-500/10",
  },
  zhipu: {
    bg: "bg-cyan-500/5",
    border: "border-cyan-500/20",
    text: "text-cyan-400",
    tagBg: "bg-cyan-500/10",
  },
};

export const DEFAULT_THEME: VendorTheme = {
  bg: "bg-muted/30",
  border: "border-border",
  text: "text-muted-foreground",
  tagBg: "bg-secondary",
};

export function getVendorTheme(vendor: string): VendorTheme {
  const normalized = vendor.toLowerCase();
  for (const [key, theme] of Object.entries(VENDOR_THEMES)) {
    if (normalized.includes(key)) return theme;
  }
  return DEFAULT_THEME;
}
