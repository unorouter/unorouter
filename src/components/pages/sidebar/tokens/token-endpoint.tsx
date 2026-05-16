"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { env } from "@/lib/config/env";
import { copyToClipboard } from "@/lib/utils/base";
import { useTranslations } from "next-intl";
import { LuCopy, LuLink } from "react-icons/lu";
import { toast } from "sonner";

export function TokenEndpoint() {
  const t = useTranslations();
  const endpoint = `${env.apiUrl}/v1/chat/completions`;
  const curlExample = `curl ${endpoint} \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4o-mini",
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
        <LuLink className="text-muted-foreground h-4 w-4" />
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
              <LuCopy className="h-3.5 w-3.5" />
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
            <LuCopy className="h-3.5 w-3.5" />
          </Button>
        </div>
        <pre className="bg-background text-foreground overflow-x-auto rounded border px-3 py-2 font-mono text-xs whitespace-pre">
          {curlExample}
        </pre>
      </div>
    </div>
  );
}
