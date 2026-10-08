"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useCustomProvidersQuery } from "@/hooks/ai/custom-providers-hook";
import { useJsPluginsQuery } from "@/hooks/ai/js-plugins-hook";
import { useCardsQuery } from "@/hooks/ai/rp/cards";
import { useCharactersQuery } from "@/hooks/ai/rp/characters";
import { useLorebooksQuery } from "@/hooks/ai/rp/lorebooks";
import { usePersonasQuery } from "@/hooks/ai/rp/personas";
import { usePresetsQuery } from "@/hooks/ai/rp/presets";
import { queryKeys } from "@/lib/react-query/keys";
import {
  backupAgeDays,
  backupIsDue,
  readBackupState,
  snoozeBackupReminder,
} from "@/lib/utils/backup-reminder";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

// Everything lives only in this browser, and a cleaner app or the browser itself
// can delete it while the app is closed. Only shown to users who built
// something of their own: a stock chat is cheap to lose, a lorebook is not.
export function BackupNotice() {
  const t = useTranslations();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const customCount = [
    useCharactersQuery().data,
    useLorebooksQuery().data,
    usePersonasQuery().data,
    usePresetsQuery().data,
    useCardsQuery().data,
    useCustomProvidersQuery().data,
    useJsPluginsQuery().data,
  ].reduce((n, rows) => n + (rows?.length ?? 0), 0);
  const persistedQuery = useQuery({
    queryKey: queryKeys.storagePersisted(),
    queryFn: async () => (await navigator.storage?.persisted?.()) ?? null,
    staleTime: Infinity,
  });
  const stateQuery = useQuery({
    queryKey: queryKeys.backupReminder(),
    queryFn: () => ({ ...readBackupState(), now: Date.now() }),
  });

  const state = stateQuery.data;
  if (!state || customCount === 0) return null;
  const now = state.now;
  if (state.snoozedUntil > now) return null;
  const notPersisted = persistedQuery.data === false;
  if (!backupIsDue(state, now)) return null;
  const ageDays = backupAgeDays(state, now);

  const backUp = async () => {
    setBusy(true);
    try {
      const { backupFilename, downloadLocalDb } =
        await import("@/lib/db/client/data/diagnostics/db-export");
      await downloadLocalDb(backupFilename(), {
        includeChats: true,
        includeMedia: true,
        includeRequestLogs: false,
      });
    } catch (e) {
      toast.error(String(e));
    } finally {
      setBusy(false);
      void qc.invalidateQueries({ queryKey: queryKeys.backupReminder() });
    }
  };

  const later = () => {
    snoozeBackupReminder();
    void qc.invalidateQueries({ queryKey: queryKeys.backupReminder() });
  };

  return (
    <div className="flex max-w-md flex-col gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs">
      <div className="flex items-start gap-2">
        <Icon
          name="triangle-alert"
          className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-400"
        />
        <div className="flex flex-col gap-1">
          <span>
            {t(
              notPersisted
                ? "CHAT.BACKUP_NOTICE_NOT_PERSISTED"
                : "CHAT.BACKUP_NOTICE_LOCAL_ONLY",
            )}
          </span>
          <span className="text-muted-foreground">
            {ageDays === null
              ? t("CHAT.BACKUP_NOTICE_NEVER")
              : t("CHAT.BACKUP_NOTICE_LAST", { days: ageDays })}
          </span>
        </div>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={later}>
          {t("CHAT.BACKUP_LATER")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => void backUp()}
        >
          <Icon
            name={busy ? "loader" : "download"}
            className={busy ? "size-4 animate-spin" : "size-4"}
          />
          {t("CHAT.BACKUP_NOW")}
        </Button>
      </div>
    </div>
  );
}
