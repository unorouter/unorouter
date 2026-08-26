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
import type { DbExportOptions } from "@/lib/db/client/data/diagnostics/db-export";
import { logChatDebug } from "@/lib/utils/chat-debug-log";
import { dayjs } from "@/lib/utils/format/date";
import { logger } from "@/lib/utils/logger";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

export function DatabaseSubmenu() {
  const t = useTranslations();
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
      const { getLocalDb, suspendLocalDb, resumeLocalDb } =
        await import("@/lib/db/client/client");
      const local = await getLocalDb();
      // Suspend BEFORE destroy: a query hook racing the close would otherwise
      // reopen live and hold the write lock the import needs to graft from it.
      suspendLocalDb();
      if (local) await local.destroy();
      const { reconcileImport } =
        await import("@/lib/db/client/data-migrate/reconcile-import");
      const res = await reconcileImport(buffer).finally(resumeLocalDb);
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
      const { resetLocalDbCache, resumeLocalDb } =
        await import("@/lib/db/client/client");
      resumeLocalDb();
      resetLocalDbCache();
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
      const { getLocalDb, resetLocalDbCache } =
        await import("@/lib/db/client/client");
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

  // Not rendered: clicking the menu item CLOSES the menu, which unmounts
  // anything rendered alongside it, so a ref to a JSX input is already null by
  // the time the handler runs and .click() silently no-ops. The picker has to
  // outlive the menu, so it lives on document.body.
  const pickFile = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".sqlite,.sqlite3,.db,application/octet-stream";
    input.style.display = "none";
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      input.remove();
      if (file) void upload(file);
    });
    // Cancelling the dialog fires no change event, so the node would leak.
    input.addEventListener("cancel", () => input.remove());
    document.body.appendChild(input);
    input.click();
  };

  return (
    <>
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
          <DropdownMenuItem onClick={pickFile}>
            <Icon name="upload" className="size-4" />
            {t("CHAT.MORE.LOCAL_DB_UPLOAD")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={wipe}>
            <Icon name="trash-2" className="size-4" />
            {t("CHAT.MORE.LOCAL_DB_WIPE")}
          </DropdownMenuItem>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    </>
  );
}
