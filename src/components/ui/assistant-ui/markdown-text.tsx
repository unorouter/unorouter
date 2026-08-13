"use client";

import { rehypeQuoteSpans } from "@/components/ui/assistant-ui/rehype-quote-spans";
import { ShikiSyntaxHighlighter } from "@/components/ui/assistant-ui/syntax-highlighter";
import { TooltipIconButton } from "@/components/ui/assistant-ui/tooltip-icon-button";
import { Icon } from "@/components/ui/icon";
import { SmartImage } from "@/components/ui/smart-image";
import { useLocalUserId } from "@/hooks/auth/use-local-user-id";
import {
  allowDataMediaUrls,
  resolveMarkdownMedia,
} from "@/lib/ai/chat/markdown-media";
import {
  hasJsHandlers,
  jsDisplayVersionAtom,
  transformDisplayJsSync,
} from "@/lib/ai/chat/plugins/engine";
import { stripThinkForDisplay } from "@/lib/ai/chat/think-tags";
import {
  imgVersionAtom,
  replaceImgTokens,
} from "@/lib/db/client/data/media/img-render";
import {
  inlayVersionAtom,
  rememberInlayDimensions,
  replaceInlayTokens,
} from "@/lib/db/client/data/media/inlay-render";
import { setLocalMediaDimensions } from "@/lib/db/client/data/media/media";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/utils/client";
import { useAuiState } from "@assistant-ui/react";
import {
  type CodeHeaderProps,
  MarkdownTextPrimitive,
  unstable_memoizeMarkdownComponents as memoizeMarkdownComponents,
  useIsMarkdownCodeBlock,
} from "@assistant-ui/react-markdown";
import "@assistant-ui/react-markdown/styles/dot.css";
import { atom, useAtomValue } from "jotai";
import { useTranslations } from "next-intl";
import { type FC, type SyntheticEvent, useEffect, useState } from "react";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import type { Pluggable } from "unified";

function normalizeMathDelimiters(text: string): string {
  return text
    .replace(/\\\[(.+?)\\\]/gs, (_m, inner) => `$$${inner}$$`)
    .replace(/\\\((.+?)\\\)/gs, (_m, inner) => `$${inner}$`);
}

const MATH_DELIMITER_RE = /\$|\\\(|\\\[/;
// Inert stand-in so the media-version subscriptions stay conditional on token
// presence without changing the hook count between renders.
const ZERO_ATOM = atom(0);
let cachedMathjax: Pluggable | null = null;

function useRehypeMathjax(wanted: boolean): Pluggable | null {
  const [plugin, setPlugin] = useState<Pluggable | null>(cachedMathjax);
  useEffect(() => {
    if (!wanted || plugin) return;
    void import("rehype-mathjax")
      .then((m) => {
        cachedMathjax = m.default as Pluggable;
        setPlugin(() => cachedMathjax);
      })
      .catch(() => {});
  }, [wanted, plugin]);
  return wanted ? plugin : null;
}

const MarkdownTextImpl = () => {
  const hasMath = useAuiState((s) =>
    s.message.content.some(
      (p) => p.type === "text" && MATH_DELIMITER_RE.test(p.text),
    ),
  );
  const mathjax = useRehypeMathjax(hasMath);
  // Subscribe to the media version counters ONLY when this message actually
  // carries a token. They are global counters bumped once per resolved image,
  // so an unconditional subscription re-ran every message's full markdown
  // pipeline (remark + rehype + mdast-to-React) on every resolution: N messages
  // x M images re-parses. Inlay/img sources are inlined base64 data URIs, so
  // each of those re-parses tokenizes hundreds of KB of URI text, which froze
  // the thread outright on image-heavy chats.
  const hasInlayToken = useAuiState((s) =>
    s.message.content.some(
      (p) => p.type === "text" && p.text.includes("{{inlay::"),
    ),
  );
  const hasImgToken = useAuiState((s) =>
    s.message.content.some(
      (p) => p.type === "text" && p.text.includes("{{img::"),
    ),
  );
  useAtomValue(hasInlayToken ? inlayVersionAtom : ZERO_ATOM);
  useAtomValue(hasImgToken ? imgVersionAtom : ZERO_ATOM);
  // Plugin display handlers resolve asynchronously into a cache; the version
  // bump re-renders once the transformed text is ready. Subscribed only while
  // a plugin actually registered a display handler.
  useAtomValue(hasJsHandlers("display") ? jsDisplayVersionAtom : ZERO_ATOM);
  const userId = useLocalUserId();
  return (
    <MarkdownTextPrimitive
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={mathjax ? [mathjax, rehypeQuoteSpans] : [rehypeQuoteSpans]}
      urlTransform={allowDataMediaUrls}
      className="aui-md"
      components={defaultComponents}
      preprocess={(text) => {
        let t = stripThinkForDisplay(text);
        if (t.includes("{{inlay::")) t = replaceInlayTokens(t, userId);
        if (t.includes("{{img::")) t = replaceImgTokens(t, userId);
        t = transformDisplayJsSync(t);
        return normalizeMathDelimiters(t);
      }}
    />
  );
};

export const MarkdownText = MarkdownTextImpl;

const CodeHeader: FC<CodeHeaderProps> = (props) => {
  const t = useTranslations();
  const { isCopied, copyToClipboard } = useCopyToClipboard();
  const onCopy = () => {
    if (!props.code || isCopied) return;
    copyToClipboard(props.code);
  };

  return (
    <div className="aui-code-header-root border-border/50 bg-muted/50 mt-2.5 flex items-center justify-between rounded-t-lg border border-b-0 px-3 py-1.5 text-xs">
      <span className="aui-code-header-language text-muted-foreground font-medium lowercase">
        {props.language}
      </span>
      <TooltipIconButton tooltip={t("CHAT.ACTION.COPY")} onClick={onCopy}>
        {!isCopied && <Icon name="copy" />}
        {isCopied && <Icon name="check" />}
      </TooltipIconButton>
    </div>
  );
};

const useCopyToClipboard = ({
  copiedDuration = 3000,
}: {
  copiedDuration?: number;
} = {}) => {
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const copyToClipboard = (value: string) => {
    if (!value || typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }

    navigator.clipboard.writeText(value).then(
      () => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), copiedDuration);
      },
      () => {},
    );
  };

  return { isCopied, copyToClipboard };
};

const defaultComponents = memoizeMarkdownComponents({
  h1: ({ className, ...props }) => (
    <h1
      className={cn(
        "aui-md-h1 mb-2 scroll-m-20 text-base font-semibold first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  h2: ({ className, ...props }) => (
    <h2
      className={cn(
        "aui-md-h2 mt-3 mb-1.5 scroll-m-20 text-sm font-semibold first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  h3: ({ className, ...props }) => (
    <h3
      className={cn(
        "aui-md-h3 mt-2.5 mb-1 scroll-m-20 text-sm font-semibold first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  h4: ({ className, ...props }) => (
    <h4
      className={cn(
        "aui-md-h4 mt-2 mb-1 scroll-m-20 text-sm font-medium first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  h5: ({ className, ...props }) => (
    <h5
      className={cn(
        "aui-md-h5 mt-2 mb-1 text-sm font-medium first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  h6: ({ className, ...props }) => (
    <h6
      className={cn(
        "aui-md-h6 mt-2 mb-1 text-sm font-medium first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  p: ({ className, ...props }) => (
    <p
      className={cn(
        "aui-md-p my-2.5 leading-normal first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  a: ({ className, ...props }) => (
    <a
      className={cn(
        "aui-md-a text-primary hover:text-primary/80 underline underline-offset-2",
        className,
      )}
      {...props}
    />
  ),
  blockquote: ({ className, ...props }) => (
    <blockquote
      className={cn(
        "aui-md-blockquote border-muted-foreground/30 text-muted-foreground my-2.5 border-l-2 pl-3 italic",
        className,
      )}
      {...props}
    />
  ),
  ul: ({ className, ...props }) => (
    <ul
      className={cn(
        "aui-md-ul marker:text-muted-foreground my-2 ml-4 list-disc [&>li]:mt-1",
        className,
      )}
      {...props}
    />
  ),
  ol: ({ className, ...props }) => (
    <ol
      className={cn(
        "aui-md-ol marker:text-muted-foreground my-2 ml-4 list-decimal [&>li]:mt-1",
        className,
      )}
      {...props}
    />
  ),
  hr: ({ className, ...props }) => (
    <hr
      className={cn("aui-md-hr border-muted-foreground/20 my-2", className)}
      {...props}
    />
  ),
  table: ({ className, ...props }) => (
    <table
      className={cn(
        "aui-md-table my-2 w-full border-separate border-spacing-0 overflow-y-auto",
        className,
      )}
      {...props}
    />
  ),
  th: ({ className, ...props }) => (
    <th
      className={cn(
        "aui-md-th bg-muted px-2 py-1 text-left font-medium first:rounded-tl-lg last:rounded-tr-lg [[align=center]]:text-center [[align=right]]:text-right",
        className,
      )}
      {...props}
    />
  ),
  td: ({ className, ...props }) => (
    <td
      className={cn(
        "aui-md-td border-muted-foreground/20 border-b border-l px-2 py-1 text-left last:border-r [[align=center]]:text-center [[align=right]]:text-right",
        className,
      )}
      {...props}
    />
  ),
  tr: ({ className, ...props }) => (
    <tr
      className={cn(
        "aui-md-tr m-0 border-b p-0 first:border-t [&:last-child>td:first-child]:rounded-bl-lg [&:last-child>td:last-child]:rounded-br-lg",
        className,
      )}
      {...props}
    />
  ),
  li: ({ className, ...props }) => (
    <li className={cn("aui-md-li leading-normal", className)} {...props} />
  ),
  sup: ({ className, ...props }) => (
    <sup
      className={cn("aui-md-sup [&>a]:text-xs [&>a]:no-underline", className)}
      {...props}
    />
  ),
  pre: ({ className, ...props }) => (
    <pre
      className={cn(
        "aui-md-pre border-border/50 bg-muted/30 overflow-x-auto overscroll-x-contain rounded-t-none rounded-b-lg border border-t-0 p-3 text-xs leading-relaxed",
        className,
      )}
      {...props}
    />
  ),
  code: function Code({ className, ...props }) {
    const isCodeBlock = useIsMarkdownCodeBlock();
    return (
      <code
        className={cn(
          !isCodeBlock &&
            "aui-md-inline-code border-border/50 bg-muted/50 rounded-md border px-1.5 py-0.5 font-mono text-[0.85em]",
          className,
        )}
        {...props}
      />
    );
  },
  CodeHeader,
  SyntaxHighlighter: ShikiSyntaxHighlighter,
  img: function MarkdownImage({ src, alt, title }) {
    const t = useTranslations();
    const { isCopied, copyToClipboard } = useCopyToClipboard();
    const imgSrc = typeof src === "string" ? src : undefined;
    const media = resolveMarkdownMedia(imgSrc, alt);
    const inlayMediaId = media.inlayMediaId;
    const isVideo = !!imgSrc && media.kind === "video";
    const isAudio = !!imgSrc && media.kind === "audio";
    const showCopyLink = !media.isDataUri;
    const showActions = !!imgSrc && !isAudio;

    // The saved file needs an extension matching the actual bytes: an alt-derived
    // name like "inlay:x@WxH" (or a wrong extension) makes iOS save a file that
    // no uploader takes back, including our own img2img.
    const handleDownload = async () => {
      if (!imgSrc) return;
      const res = await fetch(imgSrc, { cache: "no-cache" });
      const blob = await res.blob();
      const ext =
        blob.type === "image/jpeg"
          ? "jpg"
          : blob.type === "image/webp"
            ? "webp"
            : blob.type === "image/png"
              ? "png"
              : (blob.type.split("/")[1] ?? "bin");
      const base = (inlayMediaId ?? alt ?? "download").replace(/[^\w-]+/g, "-");
      downloadBlob(blob, `${base}.${ext}`);
    };

    const handleCopyLink = () => {
      if (!imgSrc) return;
      copyToClipboard(imgSrc);
    };

    // A zero-height image that pops to full size on decode grows the thread under
    // the reader, and the viewport's bottom-pin reads that as the user scrolling
    // away mid-stream. Generated media rows carry probed dimensions from birth
    // (the alt token rides them in as `@WxH`), so the box is reserved exactly.
    // Rows persisted before the probe existed are measured here once and
    // backfilled; only their first-ever view falls back to a square box.
    const userId = useLocalUserId();
    const handleLoad = (e: SyntheticEvent<HTMLImageElement>) => {
      const el = e.currentTarget;
      if (media.aspectRatio || !inlayMediaId) return;
      if (!el.naturalWidth || !el.naturalHeight) return;
      rememberInlayDimensions(inlayMediaId, el.naturalWidth, el.naturalHeight);
      void setLocalMediaDimensions(
        userId,
        inlayMediaId,
        el.naturalWidth,
        el.naturalHeight,
      ).catch(() => {});
    };

    return (
      <span className="group/img relative my-2 block first:mt-0 last:mb-0">
        {isAudio ? (
          <audio src={imgSrc} controls className="w-full max-w-md" />
        ) : isVideo ? (
          <video src={imgSrc} controls className="max-w-full rounded-lg" />
        ) : imgSrc ? (
          <SmartImage
            src={imgSrc}
            alt={alt ?? ""}
            title={title}
            width={0}
            height={0}
            onLoad={handleLoad}
            style={
              inlayMediaId
                ? { aspectRatio: media.aspectRatio ?? 1 }
                : media.isAsset && media.width && media.aspectRatio
                  ? // Assets render at natural size; their measured dimensions
                    // ride the alt token, so the exact box exists pre-decode.
                    {
                      width: media.width,
                      maxWidth: "100%",
                      aspectRatio: media.aspectRatio,
                    }
                  : // No dimensions known: a min-height still stops the jump
                    // from zero that shoves the thread while a reply streams.
                    { minHeight: "12rem" }
            }
            // Chat media are inline base64 data URIs, so next/image cannot
            // optimize them: the browser decodes the FULL-resolution bitmap
            // (width x height x 4 bytes, independent of the encoded size), and
            // sizes="100vw" told it to decode for a full-viewport render. A
            // handful of camera/4K images that way costs GBs of RAM and the
            // decode work to match. Cap the hint at the real column width, and
            // decode lazily so a thread of images does not decode all of them
            // at once on load.
            sizes="(max-width: 768px) 100vw, 768px"
            loading="lazy"
            decoding="async"
            data-asset={media.isAsset ? "" : undefined}
            className={cn(
              "max-w-full rounded-lg",
              // Generated images fill the column so the reserved aspect-ratio box
              // drives height; author assets keep their natural size.
              inlayMediaId ? "h-auto w-full" : "h-auto w-auto",
            )}
          />
        ) : null}
        {showActions && (
          <span className="absolute top-2 left-2 flex gap-1 opacity-0 transition-opacity group-hover/img:opacity-100 max-md:opacity-100">
            <TooltipIconButton
              tooltip={t("CHAT.ACTION.DOWNLOAD")}
              variant="outline"
              className="bg-background/80 size-7 backdrop-blur-sm"
              onClick={handleDownload}
            >
              <Icon name="download" className="size-3.5" />
            </TooltipIconButton>
            {showCopyLink && (
              <TooltipIconButton
                tooltip={
                  isCopied
                    ? t("CHAT.SHARE.LINK_COPIED")
                    : t("CHAT.ACTION.COPY_LINK")
                }
                variant="outline"
                className="bg-background/80 size-7 backdrop-blur-sm"
                onClick={handleCopyLink}
              >
                {isCopied ? (
                  <Icon name="check" className="size-3.5" />
                ) : (
                  <Icon name="link" className="size-3.5" />
                )}
              </TooltipIconButton>
            )}
            {inlayMediaId && (
              <TooltipIconButton
                tooltip={t("CHAT.IMAGE_PROMPT.VIEW")}
                variant="outline"
                className="bg-background/80 size-7 backdrop-blur-sm"
                onClick={() =>
                  void import("@/components/pages/sidebar/chat/image-prompt-dialog-store").then(
                    (m) => m.openImagePromptDialog(inlayMediaId),
                  )
                }
              >
                <Icon name="rotate-cw" className="size-3.5" />
              </TooltipIconButton>
            )}
          </span>
        )}
      </span>
    );
  },
});
