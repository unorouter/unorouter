"use client";

import { confirm } from "@/components/ui/confirm";
import {
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import { env } from "@/lib/config/env";
import { getLocalDb, resetLocalDbCache } from "@/lib/db/client/client";
import type { DbExportOptions } from "@/lib/db/client/data/diagnostics/db-export";
import { logChatDebug } from "@/lib/utils/chat-debug-log";
import { dayjs } from "@/lib/utils/format/date";
import { logger } from "@/lib/utils/logger";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { toast } from "sonner";

export function DatabaseSubmenu() {
  const t = useTranslations();
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const [opts, setOpts] = useState<Required<DbExportOptions>>({
    includeChats: true,
    includeRequestLogs: false,
    includeMedia: true,
  });

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
        context: "local-db.menu",
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
        context: "local-db.menu",
        error: String(err),
      });
      toast.error(String(err));
      resetLocalDbCache();
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
        context: "local-db.menu",
        error: String(err),
      });
      toast.error(String(err));
    }
  };

  const wipe = async () => {
    const ok = await confirm({
      title: t("COMMON.CONFIRM.WIPE_DB_TITLE"),
      description: t("CHAT.MORE.LOCAL_DB_WIPE_CONFIRM"),
      confirmLabel: t("CHAT.MORE.LOCAL_DB_WIPE"),
      cancelLabel: t("COMMON.CANCEL"),
      destructive: true,
    });
    if (!ok) return;
    logChatDebug("opfs.wipe.start");
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
        context: "local-db.menu",
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
        context: "local-db.menu",
        error: String(e),
      });
    }
    location.reload();
  };

  return (
    <>
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
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <Icon name="database" className="size-4" />
          {t("CHAT.MORE.LOCAL_DB")}
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          <DropdownMenuCheckboxItem
            checked={opts.includeChats}
            onCheckedChange={(v) => setOpts({ ...opts, includeChats: v })}
            closeOnClick={false}
          >
            {t("CHAT.MORE.LOCAL_DB_EXPORT_CHATS")}
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={opts.includeRequestLogs}
            onCheckedChange={(v) => setOpts({ ...opts, includeRequestLogs: v })}
            closeOnClick={false}
          >
            {t("CHAT.MORE.LOCAL_DB_EXPORT_LOGS")}
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={opts.includeMedia}
            onCheckedChange={(v) => setOpts({ ...opts, includeMedia: v })}
            closeOnClick={false}
          >
            {t("CHAT.MORE.LOCAL_DB_EXPORT_MEDIA")}
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => download(opts)}>
            <Icon name="download" className="size-4" />
            {t("CHAT.MORE.LOCAL_DB_DOWNLOAD")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => uploadInputRef.current?.click()}>
            <Icon name="upload" className="size-4" />
            {t("CHAT.MORE.LOCAL_DB_UPLOAD")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={recover}>
            <Icon name="rotate-ccw" className="size-4" />
            {t("CHAT.MORE.LOCAL_DB_RECOVER")}
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={wipe}>
            <Icon name="trash-2" className="size-4" />
            {t("CHAT.MORE.LOCAL_DB_WIPE")}
          </DropdownMenuItem>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    </>
  );
}
