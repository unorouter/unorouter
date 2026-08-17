"use client";

import { env } from "@/lib/config/env";
import { useLocalUserId } from "@/hooks/auth/use-local-user-id";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { confirm } from "@/components/ui/confirm";
import { Icon } from "@/components/ui/icon";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { GUEST_USER_ID } from "@/lib/config/constants";
import type { DbExportOptions } from "@/lib/db/client/data/diagnostics/db-export";
import { getLocalDb, resetLocalDbCache } from "@/lib/db/client/client";
import type { LocalDatabase } from "@/lib/db/client/sahpool/salvage";
import { cn } from "@/lib/utils";
import { dayjs } from "@/lib/utils/format/date";
import { logChatDebug } from "@/lib/utils/chat-debug-log";
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
    logChatDebug("opfs.wipe.start", { userId });
    try {
      const local = await getLocalDb();
      if (local) {
        await local.destroy();
        resetLocalDbCache();
      }
    } catch (e) {
      logChatDebug("opfs.wipe.destroy_error", {
        error: String(e).slice(0, 200),
      });
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
      logChatDebug("opfs.wipe.done", {});
    } catch (e) {
      logChatDebug("opfs.wipe.error", { error: String(e).slice(0, 200) });
      logger.error("OPFS wipe failed", {
        context: "local-db.studio",
        error: String(e),
      });
    }
    location.reload();
  };

  const download = async (options: DbExportOptions) => {
    try {
      const filename = `${env.appName.toLowerCase()}-${dayjs()
        .toISOString()
        .replace(/[:.]/g, "-")}.sqlite`;
      const { downloadLocalDb } =
        await import("@/lib/db/client/data/diagnostics/db-export");
      await downloadLocalDb(filename, options);
    } catch (e) {
      logger.error("DB download failed", {
        context: "local-db.studio",
        error: String(e),
      });
      toast.error(String(e));
    }
  };

  // opfs-sahpool silently drops a pool file's name mapping when its header
  // digest fails (an abrupt tab kill mid-header-write does this), and the next
  // open then creates a fresh EMPTY database under the same name. The real
  // bytes are still in the pool directory, just unreferenced. Scan for them and
  // hand the biggest one back as a download: recovery must never overwrite the
  // live db on its own, since the user may since have written to it.
  const recover = async () => {
    try {
      const { runRecoverOrphanedDb } =
        await import("@/lib/db/client/sahpool/recover-action");
      const res = await runRecoverOrphanedDb();
      if (res.kind === "none") {
        toast.error(t("CHAT.MORE.LOCAL_DB_RECOVER_NONE"));
        return;
      }
      toast.success(
        t("CHAT.MORE.LOCAL_DB_RECOVER_SUMMARY", {
          count: res.candidates,
          size: `${Math.round(res.sizeBytes / 1024 / 1024)} MB`,
        }),
      );
    } catch (err) {
      logChatDebug("db.salvage.error", { error: String(err).slice(0, 200) });
      logger.error("DB salvage failed", {
        context: "local-db.studio",
        error: String(err),
      });
      toast.error(String(err));
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
      const buffer = await file.arrayBuffer();
      const local = await getLocalDb();
      if (local) await local.destroy();
      resetLocalDbCache();
      const { reconcileImport } =
        await import("@/lib/db/client/data-migrate/reconcile-import");
      const res = await reconcileImport(buffer);
      toast.success(
        t("CHAT.MORE.LOCAL_DB_IMPORT_SUMMARY", {
          imported: res.imported,
          skipped: res.skipped,
          tables: res.tables,
        }),
      );
      setTimeout(() => location.reload(), 1200);
    } catch (err) {
      logChatDebug("opfs.import.error", { error: String(err).slice(0, 200) });
      logger.error("DB reconcile-import failed", {
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
          <DownloadPopover userId={userId} onDownload={download} />
          <ActionButton
            icon="upload"
            label={t("CHAT.MORE.LOCAL_DB_UPLOAD")}
            variant="secondary"
            onClick={() => uploadInputRef.current?.click()}
          />
          <ActionButton
            icon="rotate-ccw"
            label={t("CHAT.MORE.LOCAL_DB_RECOVER")}
            variant="secondary"
            onClick={recover}
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

function formatDbSize(bytes: number): string {
  if (bytes <= 0) return "";
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function DownloadPopover(props: {
  userId: number;
  onDownload: (
    options: DbExportOptions,
    userId?: number,
  ) => void | Promise<void>;
}) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [databases, setDatabases] = useState<LocalDatabase[]>([]);
  // Null means "whatever account is signed in", so reopening the popover after
  // switching users cannot export the previous one's database.
  const [picked, setPicked] = useState<number | null>(null);
  const selected = picked ?? props.userId;
  const [opts, setOpts] = useState<Required<DbExportOptions>>({
    includeChats: true,
    includeRequestLogs: false,
    includeMedia: true,
  });

  // A device usually holds more than the signed-in account's database: the guest
  // one from before login, and any other account used here. Only the active user
  // was reachable, so "back up before you reset" silently skipped the rest.
  useEffect(() => {
    if (!open) return;
    void (async () => {
      const { listLocalDatabases } =
        await import("@/lib/db/client/sahpool/salvage");
      const found = await listLocalDatabases();
      // The scan returns [] when OPFS cannot be read, which is exactly the
      // broken-database case where someone is trying to get their data out.
      // Always list the account being exported so the panel never looks empty.
      setDatabases(
        found.some((db) => db.userId === props.userId)
          ? found
          : [
              ...found,
              {
                userId: props.userId,
                dbPath: "",
                sizeBytes: 0,
                modifiedAt: 0,
              },
            ].sort((a, b) => a.userId - b.userId),
      );
    })();
  }, [open, props.userId]);

  const run = async (options: DbExportOptions) => {
    setOpen(false);
    setPicked(null);
    await props.onDownload(options, selected);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger
          render={
            <PopoverTrigger
              render={
                <Button
                  variant="secondary"
                  size="icon"
                  aria-label={t("CHAT.MORE.LOCAL_DB_DOWNLOAD")}
                  className="size-7"
                >
                  <Icon name="download" className="size-3" />
                </Button>
              }
            />
          }
        />
        <TooltipContent side="right">
          {t("CHAT.MORE.LOCAL_DB_DOWNLOAD")}
        </TooltipContent>
      </Tooltip>
      <PopoverContent side="right" align="start" className="w-64">
        <div className="flex flex-col gap-3">
          {databases.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground text-[11px]">
                {t("CHAT.MORE.LOCAL_DB_OTHER_DATABASES")}
              </span>
              {databases.map((db) => (
                <button
                  key={db.userId}
                  type="button"
                  // With a single database there is nothing to choose between,
                  // so the row states which one is about to be exported and its
                  // size rather than pretending to be a control.
                  disabled={databases.length < 2}
                  onClick={() => setPicked(db.userId)}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left font-mono text-xs",
                    databases.length < 2
                      ? "cursor-default"
                      : db.userId === selected
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/50",
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    <Icon
                      name={
                        db.userId === selected && databases.length > 1
                          ? "check"
                          : "database"
                      }
                      className="size-3 shrink-0"
                    />
                    {db.userId === GUEST_USER_ID
                      ? t("CHAT.MORE.LOCAL_DB_GUEST")
                      : `#${db.userId}`}
                    {db.userId === props.userId && databases.length > 1 && (
                      <span className="text-muted-foreground">
                        {t("CHAT.MORE.LOCAL_DB_CURRENT")}
                      </span>
                    )}
                  </span>
                  <span className="text-muted-foreground">
                    {formatDbSize(db.sizeBytes)}
                  </span>
                </button>
              ))}
            </div>
          )}
          <ExportToggle
            label={t("CHAT.MORE.LOCAL_DB_EXPORT_CHATS")}
            checked={opts.includeChats}
            onChange={(v) => setOpts({ ...opts, includeChats: v })}
          />
          <ExportToggle
            label={t("CHAT.MORE.LOCAL_DB_EXPORT_LOGS")}
            checked={opts.includeRequestLogs}
            onChange={(v) => setOpts({ ...opts, includeRequestLogs: v })}
          />
          <ExportToggle
            label={t("CHAT.MORE.LOCAL_DB_EXPORT_MEDIA")}
            checked={opts.includeMedia}
            onChange={(v) => setOpts({ ...opts, includeMedia: v })}
          />
          <div className="flex flex-col gap-1.5">
            <Button size="sm" onClick={() => run(opts)}>
              {t("CHAT.MORE.LOCAL_DB_DOWNLOAD")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                run({
                  includeChats: false,
                  includeRequestLogs: false,
                  includeMedia: false,
                })
              }
            >
              {t("CHAT.MORE.LOCAL_DB_EXPORT_NO_CHAT")}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ExportToggle(props: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <Checkbox checked={props.checked} onCheckedChange={props.onChange} />
      {props.label}
    </label>
  );
}

const STUDIO_CSS_URL = "/sqlocal/studio-css";

let cachedSheet: CSSStyleSheet | null = null;
async function loadStudioStylesheet(): Promise<CSSStyleSheet> {
  if (cachedSheet) return cachedSheet;
  const res = await fetch(STUDIO_CSS_URL);
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
