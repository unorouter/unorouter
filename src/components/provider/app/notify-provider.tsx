"use client";

import { notifyEventText } from "@/lib/notify/event-text";
import {
  revalidatePush,
  showOsBanner,
  syncPushTopics,
} from "@/lib/notify/push";
import { playNotifySound } from "@/lib/notify/sound";
import {
  refreshNotifyPresence,
  setNotifyEventHandler,
  syncNotifyTopics,
} from "@/lib/notify/ws-client";
import {
  activeTopicsAtom,
  notificationsAtom,
  notifyUnreadCountAtom,
  pushEnabledAtom,
  soundEnabledAtom,
} from "@/store/notify-store";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useLocale, useTranslations } from "next-intl";
import { useEffect } from "react";
import { toast } from "sonner";

// Push revalidates on every app open: pushsubscriptionchange is unreliable on
// every engine.
export function NotifyProvider() {
  const t = useTranslations();
  const locale = useLocale();
  const topics = useAtomValue(activeTopicsAtom);
  const [pushEnabled, setPushEnabled] = useAtom(pushEnabledAtom);
  const soundEnabled = useAtomValue(soundEnabledAtom);
  const setNotifications = useSetAtom(notificationsAtom);
  const unread = useAtomValue(notifyUnreadCountAtom);

  useEffect(() => {
    setNotifyEventHandler((evt) => {
      setNotifications((prev) =>
        [{ ...evt, read: false }, ...prev].slice(0, 50),
      );
      const text = notifyEventText(t, evt);
      toast(text.title, { description: text.body });
      if (soundEnabled) playNotifySound();
      // A focused tab already has toast + chime + badge, and Brave/Linux is
      // unreliable about focused-tab banners.
      if (pushEnabled && !document.hasFocus()) {
        void showOsBanner(
          text.title,
          text.body,
          `${evt.type}:${evt.data.model}`,
        );
      }
    });
    return () => setNotifyEventHandler(null);
  }, [t, setNotifications, soundEnabled, pushEnabled]);

  // Observer, not a one-shot write: Next swaps the title on every navigation.
  useEffect(() => {
    const apply = () => {
      const bare = document.title.replace(/^\(\d+\+?\) /, "");
      const next = unread ? `(${unread > 9 ? "9+" : unread}) ${bare}` : bare;
      if (document.title !== next) document.title = next;
    };
    apply();
    const el = document.querySelector("title");
    if (!el) return;
    const observer = new MutationObserver(apply);
    observer.observe(el, { childList: true });
    return () => observer.disconnect();
  }, [unread]);

  useEffect(() => {
    syncNotifyTopics(topics);
    if (pushEnabled) {
      void syncPushTopics(topics, locale).then(() => refreshNotifyPresence());
    }
  }, [topics, pushEnabled, locale]);

  useEffect(() => {
    if (!pushEnabled) return;
    revalidatePush(topics, locale).then((ok) => {
      if (ok) refreshNotifyPresence();
      else setPushEnabled(false);
    });
    // On-mount concern only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pushEnabled]);

  return null;
}
