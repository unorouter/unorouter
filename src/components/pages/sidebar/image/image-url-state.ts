import type { GenerateTab, Img2ImgSubPill } from "@/store/image-store";
import { parseAsString, parseAsStringLiteral } from "nuqs";

const IMAGE_TAB_VALUES = [
  "text2img",
  "img2img",
  "edit",
] as const satisfies readonly GenerateTab[];

const IMAGE_SUB_PILL_VALUES = [
  "img2img",
  "upscale",
  "adetailer",
  "inpaint",
] as const satisfies readonly Img2ImgSubPill[];

export const IMAGE_URL_PARSERS = {
  snap: parseAsString.withOptions({ history: "push", clearOnDefault: true }),
  tab: parseAsStringLiteral(IMAGE_TAB_VALUES)
    .withDefault("text2img")
    .withOptions({ history: "replace", clearOnDefault: true }),
  mode: parseAsStringLiteral(IMAGE_SUB_PILL_VALUES)
    .withDefault("img2img")
    .withOptions({ history: "replace", clearOnDefault: true }),
};
