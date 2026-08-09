import type { ImageModelDescriptor } from "@/lib/ai/image/models";
import type { ImageMode } from "@/lib/validation/image";
import type { GenerateTab, Img2ImgSubPill } from "../../image-nav";

export function deriveMode(
  tab: GenerateTab,
  subPill: Img2ImgSubPill,
): ImageMode {
  if (tab === "text2img") return "txt2img";
  if (tab === "edit") return "edit";
  return subPill;
}

// Descriptors without tabs are text2img-only by design (hosted catalog models).
export function isModelInTab(
  m: ImageModelDescriptor,
  tab: GenerateTab,
): boolean {
  if (!m.tabs) return tab === "text2img";
  return m.tabs.includes(tab);
}
