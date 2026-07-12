"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { useApiKey } from "@/hooks/ui/use-api-key";
import { cn } from "@/lib/utils";
import { apiKeyRevealedAtom } from "@/store/client-store";
import { useAtom } from "jotai";
import { useTranslations } from "next-intl";
import { CopyButton } from "./copy-button";

export function ApiKeyActions(props: {
  copyText: string;
  showReveal?: boolean;
  analyticsLabel?: string;
}) {
  const t = useTranslations();
  const [revealed, setRevealed] = useAtom(apiKeyRevealedAtom);
  return (
    <>
      {(props.showReveal ?? true) && (
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
        text={props.copyText}
        analyticsLabel={props.analyticsLabel}
        className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-sm p-1.5 transition-colors"
      />
    </>
  );
}

export function GenerateKeyBanner(props: {
  token: ReturnType<typeof useApiKey>;
  className?: string;
}) {
  const t = useTranslations();
  return (
    <div
      className={cn(
        "border-border bg-card flex items-center gap-2 rounded-lg border px-4 py-2",
        props.className,
      )}
    >
      <Icon name="key" className="text-muted-foreground size-3.5 shrink-0" />
      <span className="text-muted-foreground text-xs">
        {t("DOCS.GENERATE_API_KEY_DESC")}
      </span>
      <Button
        size="xs"
        variant="outline"
        className="ml-auto shrink-0 gap-1.5"
        onClick={props.token.createToken}
        disabled={props.token.isLoading}
      >
        {props.token.isLoading ? (
          <Icon name="loader" className="size-3 animate-spin" />
        ) : (
          <Icon name="plus" className="size-3" />
        )}
        {t("DOCS.GENERATE_API_KEY")}
      </Button>
    </div>
  );
}
