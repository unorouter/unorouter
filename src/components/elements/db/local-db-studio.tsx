"use client";

import { useAuthQuery } from "@/hooks/auth-hook";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getLocalDb, resetLocalDbCache } from "@/lib/db/client/client";
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

  const wipe = async () => {
    if (!confirm(t("CHAT.MORE.LOCAL_DB_WIPE_CONFIRM"))) return;
    // Destroy SQLocal worker first; its SyncAccessHandle holds an exclusive
    // lock on the sqlite file + hidden WAL/SAH-pool shards. removeEntry()
    // silently no-ops on locked files, leaving phantom OPFS usage.
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

  const download = async () => {
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

  const upload = async (file: File) => {
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
          <ActionButton
            icon="trash-2"
            label={t("CHAT.MORE.LOCAL_DB_WIPE")}
            variant="destructive"
            onClick={wipe}
          />
          <ActionButton
            icon="download"
            label={t("CHAT.MORE.LOCAL_DB_DOWNLOAD")}
            variant="secondary"
            onClick={download}
          />
          <ActionButton
            icon="upload"
            label={t("CHAT.MORE.LOCAL_DB_UPLOAD")}
            variant="secondary"
            onClick={() => uploadInputRef.current?.click()}
          />
          <input
            ref={uploadInputRef}
            type="file"
            accept=".sqlite,.sqlite3,.db,application/octet-stream"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void upload(file);
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

function ActionButton(props: {
  icon: string;
  label: string;
  variant: "destructive" | "secondary";
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant={props.variant}
            size="icon"
            aria-label={props.label}
            onClick={props.onClick}
            className="size-7"
          >
            <Icon name={props.icon} className="size-3" />
          </Button>
        }
      />
      <TooltipContent side="right">{props.label}</TooltipContent>
    </Tooltip>
  );
}

const STUDIO_CSS_URL = "/sqlocal/studio-css";

let cachedSheet: CSSStyleSheet | null = null;
async function loadStudioStylesheet(): Promise<CSSStyleSheet> {
  if (cachedSheet) return cachedSheet;
  const res = await fetch(STUDIO_CSS_URL);
  // CSS targets :root, .dark, and :is(.dark *). None match across the shadow
  // boundary, so rewrite to :host / :host(.dark). Upstream fix:
  // https://github.com/outerbase/studio/pull/506
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
