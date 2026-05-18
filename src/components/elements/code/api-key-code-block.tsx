"use client";

import { useApiKey } from "@/hooks/ui/use-api-key";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { apiKeyRevealedAtom, obfuscateApiKey } from "@/store/client-store";
import { useAtom } from "jotai";
import { useTranslations } from "next-intl";
import { Button } from "../../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../ui/tooltip";
import { CopyButton } from "./copy-button";
import { Icon } from "@/components/ui/icon";

type Props = {
  html: string;
  code: string;
  language: string;
  placeholder: string;
  label?: string;
  className?: string;
};

export function ApiKeyCodeBlock(props: Props) {
  const t = useTranslations();
  const token = useApiKey();
  const [revealed, setRevealed] = useAtom(apiKeyRevealedAtom);

  const apiKey = token.apiKey;
  const obfuscated = apiKey ? obfuscateApiKey(apiKey) : null;

  const displayKey = apiKey ? (revealed ? apiKey : obfuscated!) : null;
  const displayHtml = displayKey
    ? props.html.split(props.placeholder).join(displayKey)
    : props.html;
  const copyText = apiKey
    ? props.code.split(props.placeholder).join(apiKey)
    : props.code;

  return (
    <div>
      {props.label && (
        <p className="text-muted-foreground mb-1 font-mono text-xs">
          {props.label}
        </p>
      )}
      <div
        className={cn(
          "bg-card border-border group hover:border-foreground/20 relative w-full overflow-hidden rounded-sm border font-mono text-sm transition-colors duration-500",
          props.className,
        )}
      >
        <div className="bg-muted border-border/50 flex items-center justify-between border-b px-4 py-3">
          <div className="flex gap-1.5">
            <div className="bg-muted-foreground/20 h-2 w-2 rounded-full" />
            <div className="bg-muted-foreground/20 h-2 w-2 rounded-full" />
            <div className="bg-muted-foreground/20 h-2 w-2 rounded-full" />
          </div>
          <span className="text-muted-foreground text-[10px] tracking-wider uppercase">
            {props.language}
          </span>
        </div>
        <div
          className="p-8 [&_code]:bg-transparent! [&_pre]:bg-transparent! [&_pre]:font-mono [&_pre]:text-xs [&_pre]:leading-relaxed [&_pre]:break-all [&_pre]:whitespace-pre-wrap md:[&_pre]:text-sm"
          dangerouslySetInnerHTML={{ __html: displayHtml }}
        />
        <div className="absolute top-16 right-6 flex items-center gap-1">
          {apiKey && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => setRevealed(!revealed)}
                  />
                }
              >
                {revealed ? (
                  <Icon name="eye-off" className="size-3.5" />
                ) : (
                  <Icon name="eye" className="size-3.5" />
                )}
              </TooltipTrigger>
              <TooltipContent>
                {revealed
                  ? t("TOKEN.KEY_DISPLAY.HIDE")
                  : t("TOKEN.KEY_DISPLAY.REVEAL")}
              </TooltipContent>
            </Tooltip>
          )}
          <CopyButton
            text={copyText}
            className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-sm p-1.5 transition-colors"
          />
        </div>
      </div>

      {token.isLoggedIn && token.needsToken && (
        <div className="border-border bg-card mt-2 flex items-center gap-2 rounded-lg border px-4 py-2">
          <Icon
            name="key"
            className="text-muted-foreground size-3.5 shrink-0"
          />
          <span className="text-muted-foreground text-xs">
            {t("DOCS.GENERATE_API_KEY_DESC")}
          </span>
          <Button
            size="xs"
            variant="outline"
            className="ml-auto shrink-0 gap-1.5"
            onClick={token.createToken}
            disabled={token.isLoading}
          >
            {token.isLoading ? (
              <Icon name="loader" className="size-3 animate-spin" />
            ) : (
              <Icon name="plus" className="size-3" />
            )}
            {t("DOCS.GENERATE_API_KEY")}
          </Button>
        </div>
      )}

      {!token.isLoggedIn && (
        <p className="text-muted-foreground mt-2 flex items-center gap-1.5 text-xs">
          <Icon name="key" className="size-3" />
          <Link href="/login" className="text-primary underline">
            {t("DOCS.SETUP.LOGIN_REQUIRED")}
          </Link>
        </p>
      )}
    </div>
  );
}
