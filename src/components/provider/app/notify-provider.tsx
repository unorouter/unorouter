"use client";

import { notifyEventText } from "@/lib/notify/event-text";
import {
  pushAvailableHere,
  showOsBanner,
  subscribePush,
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

// NotifyProvider owns the live notification pipeline: it keeps the WS
// subscription in sync with the watched topics, renders incoming events as
// toasts + session inbox entries, and revalidates the push subscription on
// every app open (pushsubscriptionchange is unreliable everywhere).
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
      // OS banner only when browser notifications are toggled on and the
      // window is unfocused: the focused tab already gets toast + chime +
      // title badge, and Brave on Linux is unreliable about focused-tab
      // banners anyway.
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

  // DM-style tab title badge: prefix the unread count, survive Next.js
  // title swaps on navigation via a title-element observer.
  useEffect(() => {
    const strip = (title: string) => title.replace(/^\(\d+\+?\) /, "");
    const badge = unread > 9 ? "9+" : String(unread);
    const apply = () => {
      const current = document.title;
      const wanted = unread > 0 ? `(${badge}) ${strip(current)}` : strip(current);
      if (current !== wanted) document.title = wanted;
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
    if (!pushEnabled || !pushAvailableHere()) return;
    void (async () => {
      if (Notification.permission === "denied") {
        setPushEnabled(false);
        return;
      }
      if (Notification.permission !== "granted") return;
      const reg = await navigator.serviceWorker.getRegistration();
      // No service worker (dev server): permission alone still powers the
      // OS-notification mirror, so keep the enabled flag.
      if (!reg) return;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) {
        // Endpoint churned or was revoked: silently resubscribe. Failure
        // (e.g. Brave without its push service) keeps the flag: permission
        // is granted, so OS banners still work without a subscription.
        const fresh = await subscribePush();
        if (!fresh) return;
      }
      if (topics.length > 0) {
        await syncPushTopics(topics, locale);
        refreshNotifyPresence();
      }
    })();
    // Revalidation is an on-mount concern only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pushEnabled]);

  return null;
}
