"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePricingVendorsQuery } from "@/hooks/models/pricing-hook";
import { env } from "@/lib/config/env";
import { copyToClipboard } from "@/lib/utils/base";
import { useTranslations } from "next-intl";
import ShikiHighlighter from "react-shiki";
import { toast } from "sonner";

const FALLBACK_MODEL = "claude-opus-4-8";

export function TokenEndpoint() {
  const t = useTranslations();
  const pricing = usePricingVendorsQuery();
  const endpoint = `${env.apiUrl}/v1/chat/completions`;
  const exampleModel =
    pricing.data?.model_vendors?.find(
      (m) => m.chat && m.model_name.startsWith("claude-"),
    )?.model_name ?? FALLBACK_MODEL;
  const curlExample = `curl ${endpoint} \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${exampleModel}",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": true
  }'`;

  const handleCopy = () => {
    copyToClipboard(endpoint);
    toast.success(t("TOKEN.ENDPOINT.COPIED"));
  };
  const handleCopyCurl = () => {
    copyToClipboard(curlExample);
    toast.success(t("TOKEN.ENDPOINT.CURL_COPIED"));
  };

  return (
    <div className="bg-muted/40 mb-6 rounded-lg border p-4">
      <div className="mb-2 flex items-center gap-2">
        <Icon name="link" className="text-muted-foreground h-4 w-4" />
        <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
          {t("TOKEN.ENDPOINT.LABEL")}
        </span>
      </div>
      <div className="flex min-w-0 items-center gap-1.5">
        <code className="bg-background text-foreground block min-w-0 flex-1 truncate overflow-hidden rounded border px-2 py-1.5 font-mono text-xs">
          {endpoint}
        </code>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button variant="ghost" size="icon-sm" onClick={handleCopy} />
              }
            >
              <Icon name="copy" className="h-3.5 w-3.5" />
            </TooltipTrigger>
            <TooltipContent>{t("TOKEN.COPY_KEY")}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <p className="text-muted-foreground mt-2 text-xs">
        {t("TOKEN.ENDPOINT.HINT")}
      </p>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
            {t("TOKEN.ENDPOINT.CURL_EXAMPLE")}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleCopyCurl}
            aria-label={t("TOKEN.ENDPOINT.CURL_COPY")}
          >
            <Icon name="copy" className="h-3.5 w-3.5" />
          </Button>
        </div>
        <ShikiHighlighter
          language="bash"
          theme={{ dark: "vitesse-dark", light: "vitesse-light" }}
          addDefaultStyles={false}
          showLanguage={false}
          defaultColor="light-dark()"
          className="[&_pre]:border-border/50 [&_pre]:bg-background [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:border [&_pre]:p-3 [&_pre]:font-mono [&_pre]:text-xs [&_pre]:leading-relaxed [&_pre]:whitespace-pre"
        >
          {curlExample}
        </ShikiHighlighter>
      </div>
    </div>
  );
}
