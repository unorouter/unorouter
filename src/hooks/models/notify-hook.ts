"use client";

import { confirm } from "@/components/ui/confirm";
import { analytics } from "@/lib/analytics";
import {
  isIOS,
  isStandalone,
  pushAvailableHere,
  subscribePush,
  syncPushTopics,
} from "@/lib/notify/push";
import { refreshNotifyPresence } from "@/lib/notify/ws-client";
import {
  modelTopic,
  NOTIFY_TOPIC_FREE_MODELS,
  pushEnabledAtom,
  pushPromptSeenAtom,
  watchedTopicsAtom,
} from "@/store/notify-store";
import { useAtom } from "jotai";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

function useWatchTopic(topic: string) {
  const t = useTranslations();
  const locale = useLocale();
  const [topics, setTopics] = useAtom(watchedTopicsAtom);
  const [pushEnabled, setPushEnabled] = useAtom(pushEnabledAtom);
  const [pushPromptSeen, setPushPromptSeen] = useAtom(pushPromptSeenAtom);
  const watched = topics.includes(topic);

  const offerPush = async (nextTopics: string[]) => {
    if (pushEnabled || pushPromptSeen) return;
    setPushPromptSeen(true);
    if (isIOS() && !isStandalone()) {
      toast.info(t("NOTIFY.PUSH_IOS_HINT"), { duration: 10000 });
      return;
    }
    if (!pushAvailableHere() || Notification.permission === "denied") return;
    const accepted = await confirm({
      title: t("NOTIFY.PUSH_PROMPT_TITLE"),
      description: t("NOTIFY.PUSH_PROMPT_DESCRIPTION"),
      confirmLabel: t("NOTIFY.PUSH_PROMPT_CONFIRM"),
      cancelLabel: t("NOTIFY.PUSH_PROMPT_CANCEL"),
    });
    if (!accepted) return;
    const sub = await subscribePush();
    if (!sub) return;
    setPushEnabled(true);
    await syncPushTopics(nextTopics, locale);
    refreshNotifyPresence();
    analytics.models.notifyPushEnabled({ topics: nextTopics.length });
  };

  const toggle = () => {
    const next = watched
      ? topics.filter((item) => item !== topic)
      : [...topics, topic];
    setTopics(next);
    analytics.models.notifyWatchToggled({ topic, watched: !watched });
    if (!watched) void offerPush(next);
  };

  return { watched, toggle };
}

export function useModelWatch(modelName: string) {
  return useWatchTopic(modelTopic(modelName));
}

export function useFreeModelsWatch() {
  return useWatchTopic(NOTIFY_TOPIC_FREE_MODELS);
}
