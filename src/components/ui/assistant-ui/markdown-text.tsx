"use client";

import { rehypeQuoteSpans } from "@/components/ui/assistant-ui/rehype-quote-spans";
import { ShikiSyntaxHighlighter } from "@/components/ui/assistant-ui/syntax-highlighter";
import { TooltipIconButton } from "@/components/ui/assistant-ui/tooltip-icon-button";
import { Icon } from "@/components/ui/icon";
import { SmartImage } from "@/components/ui/smart-image";
import { useLocalUserId } from "@/hooks/auth/use-local-user-id";
import { stripThinkForDisplay } from "@/lib/ai/chat/think-tags";
import {
  inlayVersionAtom,
  replaceInlayTokens,
} from "@/lib/db/client/data/media/inlay-render";
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
import { useAtomValue } from "jotai";
import { useTranslations } from "next-intl";
import { type FC, useEffect, useState } from "react";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import type { Pluggable } from "unified";

function normalizeMathDelimiters(text: string): string {
  return text
    .replace(/\\\[(.+?)\\\]/gs, (_m, inner) => `$$${inner}$$`)
    .replace(/\\\((.+?)\\\)/gs, (_m, inner) => `$${inner}$`);
}

const allowDataImageUrls = (url: string): string => {
  if (
    url.startsWith("data:image/") ||
    url.startsWith("data:audio/") ||
    url.startsWith("data:video/")
  )
    return url;
  if (/^[a-z]+:/i.test(url) && !/^(https?|mailto|tel|ftp):/i.test(url))
    return "";
  return url;
};

const MATH_DELIMITER_RE = /\$|\\\(|\\\[/;
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
  useAtomValue(inlayVersionAtom);
  const userId = useLocalUserId();
  return (
    <MarkdownTextPrimitive
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={mathjax ? [mathjax, rehypeQuoteSpans] : [rehypeQuoteSpans]}
      urlTransform={allowDataImageUrls}
      className="aui-md"
      components={defaultComponents}
      preprocess={(text) => {
        let t = stripThinkForDisplay(text);
        if (t.includes("{{inlay::")) t = replaceInlayTokens(t, userId);
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
    const inlayMediaId = alt?.startsWith("inlay:") ? alt.slice(6) : null;
    const isVideo =
      !!imgSrc &&
      (alt === "video" ||
        imgSrc.startsWith("data:video/") ||
        /\.(mp4|webm|mov|avi|mkv)(\?.*)?$/i.test(imgSrc));
    const isAudio =
      !!imgSrc &&
      (imgSrc.startsWith("data:audio/") ||
        /\.(mp3|wav|ogg|m4a|flac|aac)(\?.*)?$/i.test(imgSrc));
    const isDataUri = !!imgSrc && imgSrc.startsWith("data:");
    const showCopyLink = !isDataUri;
    const showActions = !!imgSrc && !isAudio;

    const handleDownload = async () => {
      if (!imgSrc) return;
      const res = await fetch(imgSrc, { cache: "no-cache" });
      const blob = await res.blob();
      downloadBlob(blob, alt || "download");
    };

    const handleCopyLink = () => {
      if (!imgSrc) return;
      copyToClipboard(imgSrc);
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
            sizes="100vw"
            className="h-auto w-auto max-w-full rounded-lg"
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
