"use client";

import { confirm, confirmChoice } from "@/components/ui/confirm";
import {
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import type { DbExportOptions } from "@/lib/db/client/data/diagnostics/db-export";
import type {
  ImportMode,
  ReconcileImportResult,
} from "@/lib/db/client/data-migrate/reconcile-import";
import { queryKeys } from "@/lib/react-query/keys";
import {
  readBackupState,
  REMINDER_INTERVALS,
  setReminderInterval,
} from "@/lib/utils/backup-reminder";
import { logChatDebug } from "@/lib/utils/chat-debug-log";
import { pickFile } from "@/lib/utils/client";
import { logger } from "@/lib/utils/logger";
import { dbTransferAtom } from "@/store/chat-store";
import { useQueryClient } from "@tanstack/react-query";
import { useSetAtom } from "jotai";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

type T = ReturnType<typeof useTranslations<never>>;

export async function askImportMode(t: T): Promise<ImportMode | null> {
  const choice = await confirmChoice({
    title: t("COMMON.CONFIRM.IMPORT_DB_TITLE"),
    description: `${t("CHAT.MORE.LOCAL_DB_IMPORT_CHOICE")} ${t("CHAT.MORE.LOCAL_DB_UPLOAD_KEEP_OPEN")}`,
    confirmLabel: t("CHAT.MORE.LOCAL_DB_IMPORT_MERGE"),
    altLabel: t("CHAT.MORE.LOCAL_DB_IMPORT_REPLACE"),
    altDestructive: true,
    cancelLabel: t("COMMON.CANCEL"),
  });
  if (!choice) return null;
  return choice === "primary" ? "merge" : "replace";
}

export function toastImportResult(
  t: T,
  mode: ImportMode,
  res: ReconcileImportResult,
) {
  toast.success(
    t(
      mode === "merge"
        ? "CHAT.MORE.LOCAL_DB_MERGE_SUMMARY"
        : "CHAT.MORE.LOCAL_DB_IMPORT_SUMMARY",
      {
        imported: res.imported,
        updated: res.updated,
        skipped: res.skipped,
        tables: res.tables,
      },
    ),
  );
  setTimeout(() => location.reload(), 1200);
}

const EXPORT_OPTIONS = [
  ["includeChats", "CHAT.MORE.LOCAL_DB_EXPORT_CHATS"],
  ["includeRequestLogs", "CHAT.MORE.LOCAL_DB_EXPORT_LOGS"],
  ["includeMedia", "CHAT.MORE.LOCAL_DB_EXPORT_MEDIA"],
  ["directFromDisk", "CHAT.MORE.LOCAL_DB_EXPORT_DIRECT"],
] as const;

export function DatabaseSubmenu() {
  const t = useTranslations();
  const setTransfer = useSetAtom(dbTransferAtom);
  const qc = useQueryClient();
  const [reminderDays, setReminderDays] = useState(
    () => readBackupState().intervalDays,
  );
  const [opts, setOpts] = useState<Required<DbExportOptions>>({
    includeChats: true,
    includeRequestLogs: false,
    includeMedia: true,
    directFromDisk: false,
  });

  const download = async (options: DbExportOptions) => {
    try {
      const { backupFilename, downloadLocalDb } =
        await import("@/lib/db/client/data/diagnostics/db-export");
      await downloadLocalDb(backupFilename(), options);
    } catch (e) {
      logger.error("DB download failed", {
        context: "local-db.menu",
        error: String(e),
      });
      toast.error(String(e));
    }
  };

  const upload = async (file: File) => {
    const mode = await askImportMode(t);
    if (!mode) return;
    try {
      const { importDatabaseBuffer } =
        await import("@/lib/db/client/transfer/transfer");
      const res = await importDatabaseBuffer(await file.arrayBuffer(), mode);
      toastImportResult(t, mode, res);
    } catch (err) {
      logger.error("DB reconcile-import failed", {
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
      const { wipeLocalDb } = await import("@/lib/db/client/client");
      await wipeLocalDb();
      logChatDebug("opfs.wipe.done", {});
    } catch (e) {
      // Reloading on a failed wipe lands the user back on the same database
      // with no idea the button did nothing.
      logChatDebug("opfs.wipe.error", { error: String(e).slice(0, 200) });
      logger.error("OPFS wipe failed", {
        context: "local-db.menu",
        error: String(e),
      });
      toast.error(String(e));
      return;
    }
    location.reload();
  };

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Icon name="database" className="size-4" />
        {t("CHAT.MORE.LOCAL_DB")}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        {EXPORT_OPTIONS.map(([key, label]) => (
          <DropdownMenuCheckboxItem
            key={key}
            checked={opts[key]}
            onCheckedChange={(v) => setOpts({ ...opts, [key]: v })}
            closeOnClick={false}
          >
            {t(label)}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => download(opts)}>
          <Icon name="download" className="size-4" />
          {t("CHAT.MORE.LOCAL_DB_DOWNLOAD")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            pickFile(
              ".sqlite,.sqlite3,.db,application/octet-stream",
              (file) => void upload(file),
            )
          }
        >
          <Icon name="upload" className="size-4" />
          {t("CHAT.MORE.LOCAL_DB_UPLOAD")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setTransfer({ mode: "send", opts })}>
          <Icon name="send" className="size-4" />
          {t("CHAT.MORE.LOCAL_DB_SEND")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTransfer({ mode: "receive" })}>
          <Icon name="download" className="size-4" />
          {t("CHAT.MORE.LOCAL_DB_RECEIVE")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Icon name="bell" className="size-4" />
            {t("CHAT.MORE.BACKUP_REMINDER")}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup
              value={String(reminderDays)}
              onValueChange={(v) => {
                const days = Number(v);
                setReminderInterval(days);
                setReminderDays(days);
                void qc.invalidateQueries({
                  queryKey: queryKeys.backupReminder(),
                });
              }}
            >
              {REMINDER_INTERVALS.map((days) => (
                <DropdownMenuRadioItem key={days} value={String(days)}>
                  {days === 0
                    ? t("CHAT.MORE.BACKUP_REMINDER_OFF")
                    : t("CHAT.MORE.BACKUP_REMINDER_EVERY", { days })}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={wipe}>
          <Icon name="trash-2" className="size-4" />
          {t("CHAT.MORE.LOCAL_DB_WIPE")}
        </DropdownMenuItem>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
