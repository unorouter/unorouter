// Markdown images have no metadata slot, so media kind + the inlay media id ride
// the alt text (`alt === "video"`, `alt` starting `inlay:`) and the src extension
// or data-URI. One resolver centralizes that sniffing so the render component and
// the data-URL allowlist stay in agreement.

export type MarkdownMediaKind = "image" | "video" | "audio";

const VIDEO_EXT_RE = /\.(mp4|webm|mov|avi|mkv)(\?.*)?$/i;
const AUDIO_EXT_RE = /\.(mp3|wav|ogg|m4a|flac|aac)(\?.*)?$/i;

export type ResolvedMarkdownMedia = {
  kind: MarkdownMediaKind;
  inlayMediaId: string | null;
  isDataUri: boolean;
  isAsset: boolean;
};

export function resolveMarkdownMedia(
  src: string | undefined,
  alt: string | undefined,
): ResolvedMarkdownMedia {
  const inlayMediaId = alt?.startsWith("inlay:") ? alt.slice(6) : null;
  const isAsset = alt?.startsWith("img:") ?? false;
  const isDataUri = !!src && src.startsWith("data:");
  let kind: MarkdownMediaKind = "image";
  if (
    src &&
    (alt === "video" || src.startsWith("data:video/") || VIDEO_EXT_RE.test(src))
  ) {
    kind = "video";
  } else if (src && (src.startsWith("data:audio/") || AUDIO_EXT_RE.test(src))) {
    kind = "audio";
  }
  return { kind, inlayMediaId, isDataUri, isAsset };
}

// react-markdown's default urlTransform strips all data: URLs as an XSS defense;
// generated inline media needs image/audio/video data URIs permitted. Everything
// else keeps the default protocol allowlist.
export function allowDataMediaUrls(url: string): string {
  // blob: is same-origin media resolved at render time (inlay/img tokens); the
  // default transform would strip it as an unknown protocol.
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
