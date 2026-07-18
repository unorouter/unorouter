"use client";

import { notifyEventText } from "@/lib/notify/event-text";
import {
  getPushSubscription,
  pushAvailableHere,
  subscribePush,
  syncPushTopics,
} from "@/lib/notify/push";
import {
  refreshNotifyPresence,
  setNotifyEventHandler,
  syncNotifyTopics,
} from "@/lib/notify/ws-client";
import {
  notificationsAtom,
  pushEnabledAtom,
  watchedTopicsAtom,
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
  const topics = useAtomValue(watchedTopicsAtom);
  const [pushEnabled, setPushEnabled] = useAtom(pushEnabledAtom);
  const setNotifications = useSetAtom(notificationsAtom);

  useEffect(() => {
    setNotifyEventHandler((evt) => {
      setNotifications((prev) =>
        [{ ...evt, read: false }, ...prev].slice(0, 50),
      );
      const text = notifyEventText(t, evt);
      toast(text.title, { description: text.body });
      // Also raise a system notification (with the OS notification sound)
      // when permission is granted, so alerts are audible even while the
      // site is open in a background window.
      if (pushAvailableHere() && Notification.permission === "granted") {
        void (async () => {
          const options: NotificationOptions = {
            body: text.body,
            icon: "/images/icons/icon-192.png",
            tag: `${evt.type}:${evt.data.model}`,
          };
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg) void reg.showNotification(text.title, options);
          else new Notification(text.title, options);
        })();
      }
    });
    return () => setNotifyEventHandler(null);
  }, [t, setNotifications]);

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
      const sub = await getPushSubscription();
      if (!sub) {
        // Endpoint churned or was revoked: silently resubscribe.
        const fresh = await subscribePush();
        if (!fresh) {
          setPushEnabled(false);
          return;
        }
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
