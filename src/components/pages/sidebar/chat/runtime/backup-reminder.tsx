"use client";

import { useAuthQuery } from "@/hooks/auth/auth-hook";
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
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { toast } from "sonner";

const TOAST_ID = "backup-reminder";
const RECHECK_MS = 30 * 60_000;

// Everything lives only in this browser, and a cleaner app or the browser itself
// can delete it while the app is closed. Only for users who built something of
// their own: a stock chat is cheap to lose, a lorebook is not.
export function BackupReminder() {
  const t = useTranslations();
  const qc = useQueryClient();
  const router = useRouter();
  // Settings is login only; guests change the interval from the Database menu.
  const loggedIn = !!useAuthQuery().data;
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
    refetchInterval: RECHECK_MS,
  });

  const state = stateQuery.data;
  const due = !!state && customCount > 0 && backupIsDue(state, state.now);
  const ageDays = state ? backupAgeDays(state, state.now) : null;
  const notPersisted = persistedQuery.data === false;

  useEffect(() => {
    if (!due) {
      toast.dismiss(TOAST_ID);
      return;
    }
    const refresh = () =>
      void qc.invalidateQueries({ queryKey: queryKeys.backupReminder() });
    const backUp = async () => {
      try {
        const { backupNow } =
          await import("@/lib/db/client/data/diagnostics/db-export");
        await backupNow();
      } catch (e) {
        toast.error(String(e));
      } finally {
        refresh();
      }
    };
    toast.warning(
      ageDays === null
        ? t("CHAT.BACKUP_NOTICE_NEVER")
        : t("CHAT.BACKUP_NOTICE_LAST", { days: ageDays }),
      {
        id: TOAST_ID,
        duration: Infinity,
        description: (
          <span className="flex flex-col items-start gap-1">
            {t(
              notPersisted
                ? "CHAT.BACKUP_NOTICE_NOT_PERSISTED"
                : "CHAT.BACKUP_NOTICE_LOCAL_ONLY",
            )}
            {loggedIn && (
              <button
                type="button"
                className="underline underline-offset-2"
                onClick={() => {
                  toast.dismiss(TOAST_ID);
                  router.push({
                    pathname: "/settings",
                    query: { section: "backup" },
                  });
                }}
              >
                {t("CHAT.BACKUP_SETTINGS")}
              </button>
            )}
          </span>
        ),
        action: { label: t("CHAT.BACKUP_NOW"), onClick: () => void backUp() },
        cancel: {
          label: t("CHAT.BACKUP_LATER"),
          onClick: () => {
            snoozeBackupReminder();
            refresh();
          },
        },
      },
    );
  }, [due, ageDays, notPersisted, qc, t, router, loggedIn]);

  return null;
}
