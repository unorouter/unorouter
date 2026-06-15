"use client";

import { env } from "@/lib/config/env";
import { useLocalUserId } from "@/hooks/auth/use-local-user-id";
import { Button } from "@/components/ui/button";
import { confirm } from "@/components/ui/confirm";
import { Icon } from "@/components/ui/icon";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getLocalDb, resetLocalDbCache } from "@/lib/db/client/client";
import { downloadBlob } from "@/lib/utils/client";
import { dayjs } from "@/lib/utils/format/date";
import { logger } from "@/lib/utils/logger";
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
  const userId = useLocalUserId();
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const wipe = async () => {
    const ok = await confirm({
      title: t("COMMON.CONFIRM.WIPE_DB_TITLE"),
      description: t("CHAT.MORE.LOCAL_DB_WIPE_CONFIRM"),
      confirmLabel: t("CHAT.MORE.LOCAL_DB_WIPE"),
      cancelLabel: t("COMMON.CANCEL"),
      destructive: true,
    });
    if (!ok) return;
        // Destroy the SQLocal worker first: its handle locks the sqlite file, and removeEntry() silently no-ops on locked files.
    try {
      const local = await getLocalDb(userId);
      if (local) {
        await local.destroy();
        resetLocalDbCache();
      }
    } catch (e) {
      logger.error("SQLocal destroy failed", {
        context: "local-db.studio",
        error: String(e),
      });
    }
    try {
      const root = await navigator.storage.getDirectory();
      for await (const [name] of root.entries()) {
        await root.removeEntry(name, { recursive: true }).catch(() => {});
      }
    } catch (e) {
      logger.error("OPFS wipe failed", {
        context: "local-db.studio",
        error: String(e),
      });
    }
    location.reload();
  };

  const download = async () => {
    try {
      const local = await getLocalDb(userId);
      if (!local) throw new Error("SQLocal unavailable");
      const file = await local.getDatabaseFile();
      const filename = `${env.appName.toLowerCase()}-${userId}-${dayjs()
        .toISOString()
        .replace(/[:.]/g, "-")}.sqlite3`;
      downloadBlob(file, filename);
    } catch (e) {
      logger.error("DB download failed", {
        context: "local-db.studio",
        error: String(e),
      });
      toast.error(String(e));
    }
  };

  const upload = async (file: File) => {
    const ok = await confirm({
      title: t("COMMON.CONFIRM.UPLOAD_DB_TITLE"),
      description: t("CHAT.MORE.LOCAL_DB_UPLOAD_CONFIRM"),
      confirmLabel: t("COMMON.CONFIRM.CONTINUE"),
      cancelLabel: t("COMMON.CANCEL"),
      destructive: true,
    });
    if (!ok) return;
    try {
      const local = await getLocalDb(userId);
      if (!local) throw new Error("SQLocal unavailable");
      // Pass a plain ArrayBuffer, not the File: a File goes through Blob.stream() inside SQLocal,
      // and under this app's COEP isolation the resulting buffer is not transferable to the worker
      // (DataCloneError "not a transferable type"). A regular ArrayBuffer is forwarded as-is and transfers cleanly.
      const buffer = await file.arrayBuffer();
      await local.overwriteDatabaseFile(buffer);
      location.reload();
    } catch (err) {
      logger.error("DB overwrite failed", {
        context: "local-db.studio",
        error: String(err),
      });
      toast.error(String(err));
      resetLocalDbCache();
    }
  };

  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-[min(95vw,1400px)]! max-w-none! flex-col overflow-hidden p-0"
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
          <ShadowHost className="min-h-0 flex-1 overflow-hidden">
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
      // CSS targets :root/.dark which don't cross the shadow boundary; rewrite to :host / :host(.dark).
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
    <div
      ref={hostRef}
      className={props.className}
      style={{
        display: "block",
        height: "100%",
        width: "100%",
        overflow: "auto",
      }}
    >
      {shadow && createPortal(props.children, shadow)}
    </div>
  );
}
