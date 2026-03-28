"use client";

import { useSuitableToken } from "@/hooks/use-suitable-token";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { LuEye, LuEyeOff, LuKey, LuLoader, LuPlus } from "react-icons/lu";
import { Button } from "../ui/button";

function obfuscateKey(key: string) {
  // sk-NZcw77sF9dpWzYMP... → sk-NZcw...qP6
  const prefix = key.slice(0, 6);
  const suffix = key.slice(-3);
  return `${prefix}...${suffix}`;
}

function walkTextNodes(
  node: Node,
  search: string,
  replacement: string,
) {
  if (node.nodeType === Node.TEXT_NODE) {
    if (node.textContent?.includes(search)) {
      node.textContent = node.textContent.replaceAll(search, replacement);
    }
    return;
  }
  for (const child of Array.from(node.childNodes)) {
    walkTextNodes(child, search, replacement);
  }
}

type Props = {
  children: ReactNode;
  code: string;
  placeholder: string;
};

export function ApiKeyCodeBlock(props: Props) {
  const t = useTranslations();
  const { apiKey, isLoading, needsToken, createToken, isLoggedIn } =
    useSuitableToken();
  const containerRef = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);
  const lastReplacedRef = useRef<string | null>(null);

  // Replace placeholder text in the server-rendered HTML
  useEffect(() => {
    if (!containerRef.current || !apiKey) return;

    const displayKey = revealed ? apiKey : obfuscateKey(apiKey);
    const previousValue = lastReplacedRef.current ?? props.placeholder;

    if (previousValue === displayKey) return;

    walkTextNodes(containerRef.current, previousValue, displayKey);
    lastReplacedRef.current = displayKey;
  }, [apiKey, revealed, props.placeholder]);

  // Override the existing CopyButton's click to copy full key
  useEffect(() => {
    if (!containerRef.current || !apiKey) return;

    const copyBtn = containerRef.current.querySelector(
      "button[aria-label]",
    ) as HTMLButtonElement | null;
    if (!copyBtn) return;

    const handler = (e: Event) => {
      e.stopPropagation();
      e.preventDefault();
      const fullCode = props.code.replaceAll(props.placeholder, apiKey);
      navigator.clipboard.writeText(fullCode);
    };

    copyBtn.addEventListener("click", handler, true);
    return () => copyBtn.removeEventListener("click", handler, true);
  }, [apiKey, props.code, props.placeholder]);

  return (
    <div className="relative">
      <div ref={containerRef}>{props.children}</div>

      {/* Reveal/hide toggle */}
      {apiKey && (
        <button
          onClick={() => setRevealed(!revealed)}
          className="text-muted-foreground hover:text-foreground absolute top-16 right-14 rounded-sm p-2 transition-colors"
          aria-label={revealed ? t("TOKEN.HIDE_KEY") : t("TOKEN.REVEAL_KEY")}
        >
          {revealed ? (
            <LuEyeOff className="h-3.5 w-3.5" />
          ) : (
            <LuEye className="h-3.5 w-3.5" />
          )}
        </button>
      )}

      {/* Generate API Key prompt */}
      {isLoggedIn && needsToken && (
        <div className="border-border bg-card mt-2 flex items-center gap-2 rounded-lg border px-4 py-2">
          <LuKey className="text-muted-foreground size-3.5 shrink-0" />
          <span className="text-muted-foreground text-xs">
            {t("DOCS.GENERATE_API_KEY_DESC")}
          </span>
          <Button
            size="xs"
            variant="outline"
            className="ml-auto shrink-0 gap-1.5"
            onClick={createToken}
            disabled={isLoading}
          >
            {isLoading ? (
              <LuLoader className="size-3 animate-spin" />
            ) : (
              <LuPlus className="size-3" />
            )}
            {t("DOCS.GENERATE_API_KEY")}
          </Button>
        </div>
      )}

      {/* Login prompt */}
      {!isLoggedIn && (
        <p className="text-muted-foreground mt-2 flex items-center gap-1.5 text-xs">
          <LuKey className="size-3" />
          <Link href="/login" className="text-primary underline">
            {t("DOCS.CC_SWITCH_SETUP_LOGIN_REQUIRED")}
          </Link>
        </p>
      )}
    </div>
  );
}
