"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/ui/use-mobile";
import { downloadBlob } from "@/lib/utils/client";
import { useTranslations } from "next-intl";

export const PREVIEWABLE = new Set(["html", "svg", "mermaid"]);

// The frame never gets allow-same-origin: this origin holds the local chat
// database and the session cookies. Network access stays off, so a page a
// prompt injection wrote cannot send anything out; scripts load from pinned
// CDNs only.
const FRAME_CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://unpkg.com https://esm.sh",
  "style-src 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com data:",
  "img-src data: blob: https:",
  "media-src data: blob: https:",
  "connect-src 'none'",
  "form-action 'none'",
].join("; ");

const MERMAID =
  "https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.esm.min.mjs";

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// A second <html>/<head> from the model's page merges into these, so the CSP
// meta stays first and applies to everything after it.
function srcdocFor(language: string, code: string): string {
  const head = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${FRAME_CSP}"><meta name="viewport" content="width=device-width, initial-scale=1">`;
  if (language === "svg")
    return `${head}<style>html,body{margin:0;height:100%;display:grid;place-items:center;background:#fff}svg{max-width:100%;max-height:100%}</style></head><body>${code}</body></html>`;
  if (language === "mermaid")
    return `${head}<style>body{margin:16px;background:#fff}</style></head><body><pre class="mermaid">${escapeHtml(code)}</pre><script type="module">import m from "${MERMAID}";m.initialize({startOnLoad:true,securityLevel:"strict"});</script></body></html>`;
  return `${head}</head>${code}`;
}

export function ArtifactPreview(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  language: string;
  code: string;
}) {
  const t = useTranslations();
  const isMobile = useIsMobile();
  const ext = props.language === "mermaid" ? "mmd" : props.language;
  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className="flex w-[min(92vw,64rem)]! max-w-5xl! flex-col gap-0 overflow-hidden max-md:h-[90dvh]! max-md:w-full!"
      >
        <SheetHeader className="flex-row items-center justify-between gap-2 pr-12">
          <SheetTitle>{t("CHAT.ARTIFACT.TITLE")}</SheetTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              downloadBlob(
                new Blob([props.code], {
                  type: ext === "html" ? "text/html" : "text/plain",
                }),
                `artifact.${ext}`,
              )
            }
          >
            <Icon name="download" className="size-4" />
            {t("CHAT.TOOLS.DOWNLOAD")}
          </Button>
        </SheetHeader>
        {props.open && (
          <iframe
            title={t("CHAT.ARTIFACT.TITLE")}
            sandbox="allow-scripts allow-modals allow-popups"
            srcDoc={srcdocFor(props.language, props.code)}
            className="min-h-0 w-full flex-1 border-0 bg-white"
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
