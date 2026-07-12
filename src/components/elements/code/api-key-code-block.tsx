"use client";

import { Icon } from "@/components/ui/icon";
import { useApiKey } from "@/hooks/ui/use-api-key";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { apiKeyRevealedAtom, obfuscateApiKey } from "@/store/client-store";
import { useAtomValue } from "jotai";
import { useTranslations } from "next-intl";
import { ApiKeyActions, GenerateKeyBanner } from "./api-key-actions";

type Props = {
  html: string;
  code: string;
  language: string;
  placeholder: string;
  label?: string;
  className?: string;
  analyticsLabel?: string;
};

export function ApiKeyCodeBlock(props: Props) {
  const t = useTranslations();
  const token = useApiKey();
  const revealed = useAtomValue(apiKeyRevealedAtom);

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
          <ApiKeyActions
            copyText={copyText}
            showReveal={!!apiKey}
            analyticsLabel={props.analyticsLabel ?? "code_snippet"}
          />
        </div>
      </div>

      {token.isLoggedIn && token.needsToken && (
        <GenerateKeyBanner token={token} className="mt-2" />
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
