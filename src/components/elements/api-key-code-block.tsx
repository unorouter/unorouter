"use client";

import { useSuitableToken } from "@/hooks/use-suitable-token";
import { Link } from "@/i18n/navigation";
import { apiKeyRevealedAtom, obfuscateApiKey } from "@/store/docs-store";
import { useAtom } from "jotai";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LuEye, LuEyeOff, LuKey, LuLoader, LuPlus } from "react-icons/lu";
import { Button } from "../ui/button";

function walkTextNodes(node: Node, search: string, replacement: string) {
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
  /** The full (unobfuscated) API key, or null if not available */
  apiKey: string | null;
  /** Whether the key was rendered revealed by the server */
  initialRevealed: boolean;
  /** The placeholder text used in the code string when no key exists */
  placeholder: string;
  /** The raw code string (with placeholder or display key) for copy override */
  code: string;
};

export function ApiKeyCodeBlock(props: Props) {
  const t = useTranslations();
  const { isLoading, needsToken, createToken, isLoggedIn } =
    useSuitableToken();
  const containerRef = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useAtom(apiKeyRevealedAtom);
  const prevDisplayRef = useRef<string | null>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  const apiKey = props.apiKey;

  // Handle toggle: server rendered the initial state, client swaps on toggle.
  useEffect(() => {
    if (!containerRef.current || !apiKey) return;

    const displayKey = revealed ? apiKey : obfuscateApiKey(apiKey);
    const currentInDom = prevDisplayRef.current;

    // On first mount, record what the server rendered (no DOM change needed)
    if (!currentInDom) {
      prevDisplayRef.current = props.initialRevealed
        ? apiKey
        : obfuscateApiKey(apiKey);
      // If jotai state already differs from server render, apply immediately
      if (prevDisplayRef.current !== displayKey) {
        walkTextNodes(containerRef.current, prevDisplayRef.current, displayKey);
        prevDisplayRef.current = displayKey;
      }
      return;
    }

    if (currentInDom === displayKey) return;

    walkTextNodes(containerRef.current, currentInDom, displayKey);
    prevDisplayRef.current = displayKey;
  }, [apiKey, revealed, props.initialRevealed]);

  // Find CopyButton, create portal target, override copy with full key.
  useEffect(() => {
    if (!containerRef.current || !apiKey) return;

    const copyBtn = containerRef.current.querySelector(
      "button[aria-label]",
    ) as HTMLButtonElement | null;
    if (!copyBtn) return;

    if (!portalTarget) {
      const el = document.createElement("span");
      copyBtn.parentElement?.insertBefore(el, copyBtn);
      setPortalTarget(el);
    }

    const handler = (e: Event) => {
      e.stopPropagation();
      e.preventDefault();
      const fullCode = props.code.replaceAll(props.placeholder, apiKey);
      navigator.clipboard.writeText(fullCode);
    };

    copyBtn.addEventListener("click", handler, true);
    return () => copyBtn.removeEventListener("click", handler, true);
  }, [apiKey, props.code, props.placeholder, portalTarget]);

  return (
    <div>
      <div ref={containerRef}>{props.children}</div>

      {apiKey &&
        portalTarget &&
        createPortal(
          <button
            onClick={() => setRevealed(!revealed)}
            className="text-muted-foreground hover:text-foreground absolute right-14 top-16 rounded-sm p-2 transition-colors"
            aria-label={
              revealed ? t("TOKEN.HIDE_KEY") : t("TOKEN.REVEAL_KEY")
            }
          >
            {revealed ? (
              <LuEyeOff className="h-3.5 w-3.5" />
            ) : (
              <LuEye className="h-3.5 w-3.5" />
            )}
          </button>,
          portalTarget,
        )}

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
