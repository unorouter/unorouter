"use client";

import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import { Icon } from "@/components/ui/icon";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { useFreeModelsWatch } from "@/hooks/models/notify-hook";
import { usePricingQuery } from "@/hooks/models/pricing-hook";
import { useRouter } from "@/i18n/navigation";
import { notifyEventText } from "@/lib/notify/event-text";
import {
  pushAvailableHere,
  subscribePush,
  syncPushTopics,
} from "@/lib/notify/push";
import { refreshNotifyPresence } from "@/lib/notify/ws-client";
import { cn } from "@/lib/utils";
import { modelHref } from "@/lib/utils/base";
import { dayjs } from "@/lib/utils/format/date";
import {
  modelTopic,
  notificationsAtom,
  notifyUnreadCountAtom,
  pushEnabledAtom,
  watchedTopicsAtom,
} from "@/store/notify-store";
import { useAtom, useAtomValue } from "jotai";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

export function NotifyBell() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [notifications, setNotifications] = useAtom(notificationsAtom);
  const unread = useAtomValue(notifyUnreadCountAtom);
  const [topics, setTopics] = useAtom(watchedTopicsAtom);
  const [pushEnabled, setPushEnabled] = useAtom(pushEnabledAtom);
  const freeWatch = useFreeModelsWatch();
  const pricingQuery = usePricingQuery();
  const [open, setOpen] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | null>(
    null,
  );

  const vendorOf = (model: string) =>
    pricingQuery.data?.models.find((m) => m.name === model)?.vendor.name;

  const watchedModels = topics
    .filter((topic) => topic.startsWith("model:"))
    .map((topic) => topic.slice("model:".length));

  const unwatch = (model: string) => {
    setTopics(topics.filter((topic) => topic !== modelTopic(model)));
  };

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next && pushAvailableHere()) setPermission(Notification.permission);
    if (!next && unread > 0) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  };

  const enablePush = async () => {
    const sub = await subscribePush();
    if (pushAvailableHere()) setPermission(Notification.permission);
    if (!sub) return;
    setPushEnabled(true);
    if (topics.length > 0) {
      await syncPushTopics(topics, locale);
      refreshNotifyPresence();
    }
  };

  const pushActive = pushEnabled && permission === "granted";

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger
        nativeButton
        render={
          <button
            type="button"
            aria-label={t("NOTIFY.BELL_LABEL")}
            className="text-muted-foreground hover:text-foreground relative transition-colors"
          />
        }
      >
        <Icon name="bell" className="h-5 w-5" />
        {unread > 0 && (
          <span className="bg-primary text-primary-foreground absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-border flex items-center justify-between border-b px-3 py-2">
          <span className="text-[11px] font-bold tracking-wider uppercase">
            {t("NOTIFY.BELL_LABEL")}
          </span>
          <span className="text-muted-foreground text-[11px]">
            {t("NOTIFY.WATCHING_COUNT", { count: topics.length })}
          </span>
        </div>
        {watchedModels.length > 0 && (
          <div className="border-border border-b px-3 py-2">
            <p className="text-muted-foreground/70 mb-1.5 text-[10px] font-bold tracking-wider uppercase">
              {t("NOTIFY.WATCHED_MODELS")}
            </p>
            <div className="flex max-h-28 flex-col gap-0.5 overflow-y-auto">
              {watchedModels.map((model) => {
                const vendor = vendorOf(model);
                return (
                  <div key={model} className="flex items-center gap-2">
                    <button
                      type="button"
                      className="hover:text-primary flex min-w-0 flex-1 items-center gap-1.5 text-left"
                      onClick={() => {
                        setOpen(false);
                        router.push(
                          vendor ? modelHref(model, vendor) : "/models",
                        );
                      }}
                    >
                      {vendor && <VendorIcon vendor={vendor} size={14} />}
                      <span className="truncate font-mono text-xs">
                        {model}
                      </span>
                    </button>
                    <button
                      type="button"
                      aria-label={t("NOTIFY.UNWATCH")}
                      className="text-muted-foreground hover:text-destructive shrink-0 transition-colors"
                      onClick={() => unwatch(model)}
                    >
                      <Icon name="x" className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-3 py-6 text-center">
              <p className="text-muted-foreground text-sm">
                {t("NOTIFY.EMPTY")}
              </p>
              <p className="text-muted-foreground/70 mt-1 text-xs">
                {t("NOTIFY.EMPTY_HINT")}
              </p>
            </div>
          ) : (
            notifications.map((n) => {
              const text = notifyEventText(t, n);
              const vendor = vendorOf(n.data.model);
              return (
                <button
                  key={n.id}
                  type="button"
                  className={cn(
                    "hover:bg-muted/50 flex w-full items-start gap-2.5 px-3 py-2 text-left transition-colors",
                    !n.read && "bg-primary/5",
                  )}
                  onClick={() => {
                    setOpen(false);
                    router.push(
                      vendor ? modelHref(n.data.model, vendor) : "/models",
                    );
                  }}
                >
                  {vendor ? (
                    <VendorIcon vendor={vendor} size={18} />
                  ) : (
                    <Icon
                      name="bell"
                      className="text-muted-foreground mt-0.5 h-4 w-4"
                    />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="text-foreground block truncate text-[13px] font-medium">
                      {text.title}
                    </span>
                    <span className="text-muted-foreground block truncate text-xs">
                      {text.body}
                    </span>
                  </span>
                  <span className="text-muted-foreground/70 mt-0.5 shrink-0 text-[10px]">
                    {dayjs.unix(n.ts).fromNow(true)}
                  </span>
                </button>
              );
            })
          )}
        </div>
        <div className="border-border flex items-center justify-between border-t px-3 py-2">
          <span className="text-muted-foreground text-xs">
            {t("NOTIFY.WATCH_FREE_MODELS")}
          </span>
          <Switch
            checked={freeWatch.watched}
            onCheckedChange={() => freeWatch.toggle()}
          />
        </div>
        {pushAvailableHere() && (
          <div className="border-border flex items-center justify-between border-t px-3 py-2">
            {pushActive ? (
              <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
                <Icon name="check" className="h-3.5 w-3.5 text-green-500" />
                {t("NOTIFY.PUSH_ON")}
              </span>
            ) : permission === "denied" ? (
              <span className="text-muted-foreground/70 text-xs">
                {t("NOTIFY.PUSH_BLOCKED")}
              </span>
            ) : (
              <button
                type="button"
                className="text-primary hover:text-primary/80 text-xs font-medium transition-colors"
                onClick={() => void enablePush()}
              >
                {t("NOTIFY.PUSH_ENABLE")}
              </button>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
