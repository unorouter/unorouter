"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { queryKeys } from "@/lib/react-query/keys";
import {
  readBackupState,
  REMINDER_INTERVALS,
  setReminderInterval,
} from "@/lib/utils/backup-reminder";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

// All of it is per browser and kept outside the database, so restoring a
// backup never carries another device's backup date or reminder in with it.
export function BackupCard() {
  const t = useTranslations();
  const locale = useLocale();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const stateQuery = useQuery({
    queryKey: queryKeys.backupReminder(),
    queryFn: () => ({ ...readBackupState(), now: Date.now() }),
  });
  const persistedQuery = useQuery({
    queryKey: queryKeys.storagePersisted(),
    queryFn: async () => (await navigator.storage?.persisted?.()) ?? null,
    staleTime: Infinity,
  });
  const state = stateQuery.data;
  const refresh = () =>
    void qc.invalidateQueries({ queryKey: queryKeys.backupReminder() });

  const intervalLabel = (days: number) =>
    days === 0
      ? t("CHAT.MORE.BACKUP_REMINDER_OFF")
      : t("CHAT.MORE.BACKUP_REMINDER_EVERY", { days });

  const backUp = async () => {
    setBusy(true);
    try {
      const { backupNow } =
        await import("@/lib/db/client/data/diagnostics/db-export");
      await backupNow();
    } catch (e) {
      toast.error(String(e));
    } finally {
      setBusy(false);
      refresh();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("SETTINGS.BACKUP.TITLE")}</CardTitle>
        <CardDescription>{t("SETTINGS.BACKUP.DESCRIPTION")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="font-medium">
              {t("SETTINGS.BACKUP.LAST_BACKUP")}
            </span>
            <span className="text-muted-foreground text-xs">
              {state?.lastBackupAt
                ? new Date(state.lastBackupAt).toLocaleString(locale)
                : t("CHAT.BACKUP_NOTICE_NEVER")}
            </span>
          </div>
          <Button variant="outline" disabled={busy} onClick={backUp}>
            <Icon
              name={busy ? "loader" : "download"}
              className={busy ? "size-4 animate-spin" : "size-4"}
            />
            {t("CHAT.BACKUP_NOW")}
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="font-medium">{t("CHAT.MORE.BACKUP_REMINDER")}</span>
          <Select
            value={String(state?.intervalDays ?? 1)}
            onValueChange={(v) => {
              setReminderInterval(Number(v));
              refresh();
            }}
          >
            <SelectTrigger className="w-44">
              <SelectValue>
                {(value: string) => intervalLabel(Number(value))}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {REMINDER_INTERVALS.map((days) => (
                <SelectItem key={days} value={String(days)}>
                  {intervalLabel(days)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {persistedQuery.data != null && (
          <div className="flex flex-col">
            <span className="font-medium">
              {t("SETTINGS.BACKUP.PERSISTENT")}
            </span>
            <span className="text-muted-foreground text-xs">
              {persistedQuery.data
                ? t("SETTINGS.BACKUP.PERSISTENT_YES")
                : t("SETTINGS.BACKUP.PERSISTENT_NO")}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
