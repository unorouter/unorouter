import type { PlaygroundModelDescriptor } from "@/lib/ai/playground/models";
import type { GenerationMode } from "@/lib/validation/playground";
import type { GenerateTab, Img2ImgSubPill } from "../image-nav";

export function deriveMode(
  tab: GenerateTab,
  subPill: Img2ImgSubPill,
): GenerationMode {
  if (tab === "text2img") return "txt2img";
  if (tab === "edit") return "edit";
  return subPill;
}

// Descriptors without tabs are text2img-only by design (hosted catalog models).
export function isModelInTab(
  m: PlaygroundModelDescriptor,
  tab: GenerateTab,
): boolean {
  if (!m.tabs) return tab === "text2img";
  return m.tabs.includes(tab);
}
