"use client";

// ---------------------------------------------------------------------------
// Inline browser for the on-device SQLocal database (LibSQL Studio + a
// custom SqliteLikeBaseDriver wired to our SQLocal worker). Mounted on the
// chat + generate page actions menus. Studio's bundle (`@libsqlstudio/gui`,
// ~107 KB JS + 40 KB CSS) is loaded lazily via `next/dynamic` only when the
// sheet first opens, so production users that never open the panel don't
// pay the cost. Studio's Tailwind preflight would clobber our shadcn styles
// at the document level, so the component is mounted inside an open Shadow
// Root with the package CSS adopted into that root only.
// ---------------------------------------------------------------------------

import { useAuthQuery } from "@/hooks/auth-hook";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { getLocalDb, resetLocalDbCache } from "@/lib/db/client/client";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const StudioInner = dynamic(() => import("./local-db-studio-inner"), {
  ssr: false,
});

export function LocalDbStudio(props: Props) {
  const t = useTranslations();
  const auth = useAuthQuery();
  const userId = auth.data?.id ?? 0;
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const handleWipe = async () => {
    if (!confirm(t("CHAT.MORE.LOCAL_DB_WIPE_CONFIRM"))) return;
    // Destroy the SQLocal worker FIRST. Its SyncAccessHandle holds an
    // exclusive lock on the sqlite file plus hidden WAL/SAH-pool shards;
    // removeEntry() silently no-ops on locked files, leaving phantom OPFS
    // usage (visible as `fileSystem` bytes > 0 with an empty root listing).
    try {
      const local = await getLocalDb(userId);
      if (local) {
        await local.destroy();
        resetLocalDbCache();
      }
    } catch (e) {
      console.error("SQLocal destroy failed", e);
    }
    try {
      const root = await navigator.storage.getDirectory();
      for await (const [name] of root.entries()) {
        await root.removeEntry(name, { recursive: true }).catch(() => {});
      }
    } catch (e) {
      console.error("OPFS wipe failed", e);
    }
    location.reload();
  };

  const handleDownload = async () => {
    try {
      const local = await getLocalDb(userId);
      if (!local) throw new Error("SQLocal unavailable");
      const file = await local.getDatabaseFile();
      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = `unorouter-${userId}-${new Date()
        .toISOString()
        .replace(/[:.]/g, "-")}.sqlite3`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("DB download failed", e);
      toast.error(String(e));
    }
  };

  const handleUploadFile = async (file: File) => {
    if (!confirm(t("CHAT.MORE.LOCAL_DB_UPLOAD_CONFIRM"))) return;
    try {
      const local = await getLocalDb(userId);
      if (!local) throw new Error("SQLocal unavailable");
      await local.overwriteDatabaseFile(file);
      location.reload();
    } catch (err) {
      console.error("DB overwrite failed", err);
      toast.error(String(err));
    }
  };

  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent
        side="right"
        className="w-[min(95vw,1400px)]! max-w-none! p-0"
      >
        <SheetTitle className="sr-only">{t("CHAT.MORE.LOCAL_DB")}</SheetTitle>
        <div className="absolute top-20 left-2 z-10 flex flex-col gap-1.5">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="destructive"
                  size="icon"
                  aria-label={t("CHAT.MORE.LOCAL_DB_WIPE")}
                  onClick={handleWipe}
                  className="size-7"
                >
                  <Icon name="trash-2" className="size-3" />
                </Button>
              }
            />
            <TooltipContent side="right">
              {t("CHAT.MORE.LOCAL_DB_WIPE")}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="secondary"
                  size="icon"
                  aria-label={t("CHAT.MORE.LOCAL_DB_DOWNLOAD")}
                  onClick={handleDownload}
                  className="size-7"
                >
                  <Icon name="download" className="size-3" />
                </Button>
              }
            />
            <TooltipContent side="right">
              {t("CHAT.MORE.LOCAL_DB_DOWNLOAD")}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="secondary"
                  size="icon"
                  aria-label={t("CHAT.MORE.LOCAL_DB_UPLOAD")}
                  onClick={() => uploadInputRef.current?.click()}
                  className="size-7"
                >
                  <Icon name="upload" className="size-3" />
                </Button>
              }
            />
            <TooltipContent side="right">
              {t("CHAT.MORE.LOCAL_DB_UPLOAD")}
            </TooltipContent>
          </Tooltip>
          <input
            ref={uploadInputRef}
            type="file"
            accept=".sqlite,.sqlite3,.db,application/octet-stream"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void handleUploadFile(file);
            }}
          />
        </div>
        {props.open && (
          <ShadowHost className="size-full">
            <StudioInner userId={userId} />
          </ShadowHost>
        )}
      </SheetContent>
    </Sheet>
  );
}

// Mounts children inside an open shadow root so Studio's global Tailwind
// preflight stays scoped. Fetches the package CSS once and re-uses the
// constructable stylesheet across all instances. Stylesheet is copied to
// /public/sqlocal/studio.css by scripts/bundle-sqlocal-worker.ts on
// postinstall / prebuild.
const STUDIO_CSS_URL = "/sqlocal/studio.css";

let cachedSheet: CSSStyleSheet | null = null;
async function loadStudioStylesheet(): Promise<CSSStyleSheet> {
  if (cachedSheet) return cachedSheet;
  const res = await fetch(STUDIO_CSS_URL);
  // The CSS targets `:root` (Tailwind theme tokens), `.dark` (legacy dark
  // class), and Tailwind v3 `:is(.dark *)` (compiled dark variant). Inside
  // a shadow root none of those match a class on the shadow host because
  // descendant combinators don't cross the shadow boundary. Rewrite each to
  // target the host. See PR https://github.com/outerbase/studio/pull/506
  // for the proposed upstream fix.
  const text = (await res.text())
    .replace(/:root\b/g, ":host")
    .replace(/:is\(\.dark\s*\*\)/g, "")
    .replace(/(^|[^a-zA-Z_-])\.dark([^\w\\-]|$)/g, "$1:host(.dark)$2");
  const sheet = new CSSStyleSheet();
  await sheet.replace(text);
  cachedSheet = sheet;
  return sheet;
}

function ShadowHost(props: { children: React.ReactNode; className?: string }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [shadow, setShadow] = useState<ShadowRoot | null>(null);

  useEffect(() => {
    if (!hostRef.current) return;
    const root =
      hostRef.current.shadowRoot ??
      hostRef.current.attachShadow({ mode: "open" });
    hostRef.current.classList.add("dark");
    let cancelled = false;
    void loadStudioStylesheet().then((sheet) => {
      if (cancelled) return;
      root.adoptedStyleSheets = [sheet];
      setShadow(root);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div ref={hostRef} className={props.className}>
      {shadow && createPortal(props.children, shadow)}
    </div>
  );
}
