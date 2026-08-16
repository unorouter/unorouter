"use client";

import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import { CopyButton } from "@/components/elements/code/copy-button";
import { Icon } from "@/components/ui/icon";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFreeModelsWatch } from "@/hooks/models/notify-hook";
import { usePricingVendorsQuery } from "@/hooks/models/pricing-hook";
import { useRouter } from "@/i18n/navigation";
import { notifyEventText } from "@/lib/notify/event-text";
import {
  pushAvailableHere,
  pushServiceBroken,
  subscribePush,
  syncPushTopics,
  unsubscribePush,
} from "@/lib/notify/push";
import { playNotifySound } from "@/lib/notify/sound";
import { refreshNotifyPresence } from "@/lib/notify/ws-client";
import { cn } from "@/lib/utils";
import { modelHref } from "@/lib/utils/base";
import { dayjs } from "@/lib/utils/format/date";
import {
  activeTopicsAtom,
  modelTopic,
  mutedTopicsAtom,
  notificationsAtom,
  notifyUnreadCountAtom,
  pushEnabledAtom,
  soundEnabledAtom,
  watchedTopicsAtom,
} from "@/store/notify-store";
import { useAtom, useAtomValue } from "jotai";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

export function NotifyBell() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [notifications, setNotifications] = useAtom(notificationsAtom);
  const unread = useAtomValue(notifyUnreadCountAtom);
  const [topics, setTopics] = useAtom(watchedTopicsAtom);
  const [muted, setMuted] = useAtom(mutedTopicsAtom);
  const activeTopics = useAtomValue(activeTopicsAtom);
  const [pushEnabled, setPushEnabled] = useAtom(pushEnabledAtom);
  const [soundEnabled, setSoundEnabled] = useAtom(soundEnabledAtom);
  const freeWatch = useFreeModelsWatch();
  const [open, setOpen] = useState(false);
  const vendorsQuery = usePricingVendorsQuery(open);
  const [permission, setPermission] = useState<NotificationPermission | null>(
    null,
  );
  const [pushBusy, setPushBusy] = useState(false);
  const [query, setQuery] = useState("");

  const vendorOf = (model: string) =>
    vendorsQuery.data?.model_vendors.find((m) => m.model_name === model)
      ?.vendor;

  const watchedModels = topics
    .filter((topic) => topic.startsWith("model:"))
    .map((topic) => topic.slice("model:".length));

  const unwatch = (model: string) => {
    setTopics(topics.filter((topic) => topic !== modelTopic(model)));
    setMuted(muted.filter((topic) => topic !== modelTopic(model)));
  };

  const setTopicMuted = (model: string, next: boolean) => {
    const topic = modelTopic(model);
    setMuted(
      next ? [...muted, topic] : muted.filter((entry) => entry !== topic),
    );
  };

  // Free-text watch: any model name is accepted, including models currently
  // offline or churned out of the catalog (the point of a comeback alert).
  // One '*' wildcard covers a family (glm-*); server enforces the same rules.
  const raw = query.trim();
  const rawValid =
    /^[A-Za-z0-9:._/*-]{1,150}$/.test(raw) &&
    (raw.match(/\*/g) ?? []).length <= 1 &&
    raw.replaceAll("*", "").length >= 2 &&
    !topics.includes(modelTopic(raw));

  const addWatch = () => {
    if (!rawValid) return;
    setTopics([...topics, modelTopic(raw)]);
    setQuery("");
  };

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next && pushAvailableHere()) setPermission(Notification.permission);
    if (!next && unread > 0) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  };

  const enablePush = async () => {
    setPushBusy(true);
    try {
      const sub = await subscribePush();
      if (pushAvailableHere()) setPermission(Notification.permission);
      // Granted permission without a push subscription still counts as
      // enabled: OS notifications for open tabs need only the permission (no
      // service worker registered on the dev server, so subscribePush yields
      // null there).
      if (!sub && Notification.permission !== "granted") return;
      setPushEnabled(true);
      if (sub && activeTopics.length > 0) {
        await syncPushTopics(activeTopics, locale);
        refreshNotifyPresence();
      } else if (!sub && (await pushServiceBroken())) {
        toast.warning(t("NOTIFY.PUSH_SERVICE_ERROR"));
      }
    } finally {
      setPushBusy(false);
    }
  };

  const disablePush = async () => {
    setPushBusy(true);
    try {
      setPushEnabled(false);
      await unsubscribePush();
    } finally {
      setPushBusy(false);
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
        <Tabs defaultValue="inbox" className="gap-0">
          <div className="border-border border-b p-2">
            <TabsList className="w-full">
              <TabsTrigger value="inbox" className="text-xs">
                {t("NOTIFY.TAB_INBOX")}
                {unread > 0 && (
                  <span className="bg-primary text-primary-foreground flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="watched" className="text-xs">
                {t("NOTIFY.TAB_WATCHED")}
                <span className="text-muted-foreground">({topics.length})</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="inbox">
            {notifications.length > 0 && (
              <div className="border-border flex justify-end border-b px-3 py-1.5">
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground text-xs transition-colors"
                  onClick={() => setNotifications([])}
                >
                  {t("NOTIFY.CLEAR")}
                </button>
              </div>
            )}
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-3 py-8 text-center">
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
                    <div
                      key={n.id}
                      className={cn(
                        "hover:bg-muted/50 flex w-full items-start gap-2.5 px-3 py-2 transition-colors",
                        !n.read && "bg-primary/5",
                      )}
                    >
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-start gap-2.5 text-left"
                        onClick={() => {
                          setOpen(false);
                          router.push(modelHref(n.data.model, vendor));
                        }}
                      >
                        {vendor ? (
                          <VendorIcon vendor={vendor} size={18} />
                        ) : (
                          <Icon
                            name="bell"
                            className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0"
                          />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="text-foreground line-clamp-2 text-[13px] font-medium break-all">
                            {text.title}
                          </span>
                          <span className="text-muted-foreground block truncate text-xs">
                            {text.body}
                          </span>
                        </span>
                      </button>
                      <span className="mt-0.5 flex shrink-0 items-center gap-1.5">
                        <CopyButton
                          text={n.data.model}
                          analyticsLabel="model_name"
                        />
                        <span className="text-muted-foreground/70 text-[10px]">
                          {dayjs.unix(n.ts).fromNow(true)}
                        </span>
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </TabsContent>

          <TabsContent value="watched">
            <div className="p-3">
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addWatch();
                  }}
                  placeholder={t("NOTIFY.ADD_MODEL_PLACEHOLDER")}
                  className="border-border/60 bg-muted/30 placeholder:text-muted-foreground/60 focus:border-primary/50 h-7 min-w-0 flex-1 rounded border px-2 font-mono text-xs outline-none"
                />
                <button
                  type="button"
                  aria-label={t("NOTIFY.WATCH")}
                  disabled={!rawValid}
                  className="border-border/60 text-muted-foreground hover:text-primary hover:border-primary/50 flex h-7 w-7 shrink-0 items-center justify-center rounded border transition-colors disabled:pointer-events-none disabled:opacity-40"
                  onClick={() => addWatch()}
                >
                  <Icon name="plus" className="h-3.5 w-3.5" />
                </button>
              </div>
              {watchedModels.length > 0 && (
                <div className="mt-2 flex max-h-72 flex-col overflow-x-hidden overflow-y-auto py-2">
                  {watchedModels.map((model) => {
                    const vendor = vendorOf(model);
                    const isPattern = model.includes("*");
                    const isMuted = muted.includes(modelTopic(model));
                    return (
                      <div
                        key={model}
                        className="hover:bg-muted/40 flex items-center gap-2 rounded py-1"
                      >
                        <button
                          type="button"
                          disabled={isPattern}
                          className={cn(
                            "hover:text-primary flex min-w-0 flex-1 items-center gap-1.5 text-left disabled:pointer-events-none",
                            isMuted && "opacity-50",
                          )}
                          onClick={() => {
                            setOpen(false);
                            router.push(modelHref(model, vendor));
                          }}
                        >
                          {vendor ? (
                            <VendorIcon vendor={vendor} size={14} />
                          ) : (
                            <Icon
                              name="bell"
                              className="text-muted-foreground h-3.5 w-3.5 shrink-0"
                            />
                          )}
                          <span className="truncate font-mono text-xs">
                            {model}
                          </span>
                        </button>
                        <Switch
                          size="sm"
                          checked={!isMuted}
                          onCheckedChange={(next) =>
                            setTopicMuted(model, !next)
                          }
                        />
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
            <div className="border-border flex items-center justify-between border-t px-3 py-2">
              <span className="text-muted-foreground text-xs">
                {t("NOTIFY.SOUND")}
              </span>
              <Switch
                checked={soundEnabled}
                onCheckedChange={(next) => {
                  setSoundEnabled(next);
                  if (next) playNotifySound();
                }}
              />
            </div>
          </TabsContent>
        </Tabs>
        {pushAvailableHere() && (
          <div className="border-border flex items-center justify-between border-t px-3 py-2">
            {permission === "denied" ? (
              <span className="text-muted-foreground/70 text-xs">
                {t("NOTIFY.PUSH_BLOCKED")}
              </span>
            ) : (
              <>
                <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
                  {t("NOTIFY.PUSH_LABEL")}
                  {pushBusy && (
                    <Icon name="loader" className="size-3 animate-spin" />
                  )}
                </span>
                <Switch
                  checked={pushActive}
                  disabled={pushBusy}
                  onCheckedChange={(next) => {
                    if (next) void enablePush();
                    else void disablePush();
                  }}
                />
              </>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
