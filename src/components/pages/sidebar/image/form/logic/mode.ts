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
