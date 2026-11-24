type MarkdownMediaKind = "image" | "video" | "audio";

const VIDEO_EXT_RE = /\.(mp4|webm|mov|avi|mkv)(\?.*)?$/i;
const AUDIO_EXT_RE = /\.(mp3|wav|ogg|m4a|flac|aac)(\?.*)?$/i;

type ResolvedMarkdownMedia = {
  kind: MarkdownMediaKind;
  inlayMediaId: string | null;
  isDataUri: boolean;
  isAsset: boolean;
  aspectRatio: number | null;
  width: number | null;
  height: number | null;
};

const INLAY_ALT_RE = /^inlay:([\w-]+)(?:~(video|audio))?(?:@(\d+)x(\d+))?$/;
const ASSET_ALT_RE = /^img:(.*?)(?:@(\d+)x(\d+))?$/;

export function resolveMarkdownMedia(
  src: string | undefined,
  alt: string | undefined,
): ResolvedMarkdownMedia {
  const inlayMatch = alt ? INLAY_ALT_RE.exec(alt) : null;
  const inlayMediaId = inlayMatch ? inlayMatch[1] : null;
  const assetMatch = !inlayMatch && alt ? ASSET_ALT_RE.exec(alt) : null;
  const size = inlayMatch
    ? [inlayMatch[3], inlayMatch[4]]
    : [assetMatch?.[2], assetMatch?.[3]];
  const width = size[0] ? Number(size[0]) : 0;
  const height = size[1] ? Number(size[1]) : 0;
  const aspectRatio = width > 0 && height > 0 ? width / height : null;
  const isAsset = assetMatch !== null;
  const isDataUri = !!src && src.startsWith("data:");
  let kind: MarkdownMediaKind = "image";
  if (
    src &&
    (alt === "video" ||
      inlayMatch?.[2] === "video" ||
      src.startsWith("data:video/") ||
      VIDEO_EXT_RE.test(src))
  ) {
    kind = "video";
  } else if (
    src &&
    (inlayMatch?.[2] === "audio" ||
      src.startsWith("data:audio/") ||
      AUDIO_EXT_RE.test(src))
  ) {
    kind = "audio";
  }
  return {
    kind,
    inlayMediaId,
    isDataUri,
    isAsset,
    aspectRatio,
    width: width > 0 ? width : null,
    height: height > 0 ? height : null,
  };
}

// Replaces react-markdown's XSS urlTransform: widens it to media data:/blob: ONLY, everything else keeps the protocol allowlist.
export function allowDataMediaUrls(url: string): string {
  if (url.startsWith("blob:")) return url;
  if (
    url.startsWith("data:image/") ||
    url.startsWith("data:audio/") ||
    url.startsWith("data:video/")
  )
    return url;
  if (/^[a-z]+:/i.test(url) && !/^(https?|mailto|tel|ftp):/i.test(url))
    return "";
  return url;
}
