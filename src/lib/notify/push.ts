"use client";

import { base64ToUint8 } from "@/lib/utils/base";
import {
  getNotifyVapidKey,
  subscribeNotifyPush,
  unsubscribeNotifyPush,
} from "@/openapi";

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && navigator.standalone === true)
  );
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

// iOS only delivers web push to installed home-screen PWAs.
export function pushAvailableHere(): boolean {
  if (!pushSupported()) return false;
  if (isIOS() && !isStandalone()) return false;
  return true;
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  return base64ToUint8(normalized);
}

// getRegistration, NOT .ready: with no service worker registered (dev server)
// .ready never resolves and would hang every caller forever.
export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return null;
  try {
    return await reg.pushManager.getSubscription();
  } catch {
    // Firefox/Brave with the push service disabled reject even the READ with
    // AbortError "Error retrieving push subscription".
    return null;
  }
}

async function fetchVapidKey(): Promise<string | null> {
  const res = await getNotifyVapidKey().catch(() => null);
  if (!res?.data.success) return null;
  return res.data.data?.key ?? null;
}

export async function subscribePush(): Promise<PushSubscription | null> {
  if (!pushAvailableHere()) return null;
  if (Notification.permission === "denied") return null;
  if (Notification.permission !== "granted") {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;
  }
  const key = await fetchVapidKey();
  if (!key) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return null;
  const existing = await reg.pushManager.getSubscription();
  if (existing) return existing;
  try {
    return await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    });
  } catch {
    // AbortError "push service error": Brave with Google services for push
    // messaging disabled. Permission itself is granted, so in-page OS
    // banners still work; only closed-tab delivery is unavailable.
    return null;
  }
}

// Re-attaches the push subscription on app open (pushsubscriptionchange is
// unreliable on every engine) and re-syncs topics. Returns false when the user
// revoked permission, so the caller can drop its toggle. Never prompts: an
// ungranted permission means they declined, and subscribePush would re-ask.
export async function revalidatePush(
  topics: string[],
  locale: string,
): Promise<boolean> {
  if (Notification.permission === "denied") return false;
  if (Notification.permission !== "granted") return true;
  if (!(await subscribePush())) return true;
  if (topics.length > 0) await syncPushTopics(topics, locale);
  return true;
}

// True when web push is structurally possible here but subscribing failed
// (push service unavailable), as opposed to no service worker at all.
export async function pushServiceBroken(): Promise<boolean> {
  if (!pushSupported() || Notification.permission !== "granted") return false;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return false;
  try {
    return (await reg.pushManager.getSubscription()) === null;
  } catch {
    return true;
  }
}

export async function syncPushTopics(
  topics: string[],
  locale: string,
): Promise<boolean> {
  const sub = await getPushSubscription();
  if (!sub) return false;
  if (topics.length === 0) {
    await unsubscribeNotifyPush({ endpoint: sub.endpoint }).catch(
      () => undefined,
    );
    return true;
  }
  const json = sub.toJSON();
  const res = await subscribeNotifyPush({
    endpoint: sub.endpoint,
    keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" },
    topics,
    locale,
  }).catch(() => null);
  return res?.data.success === true;
}

// OS banner for an in-page event; prefers the service worker path so the
// banner behaves identically to real web push (tag collapse, click handling).
export async function showOsBanner(title: string, body: string, tag: string) {
  if (!pushAvailableHere() || Notification.permission !== "granted") return;
  const options: NotificationOptions = {
    body,
    tag,
    icon: "/images/icons/icon-192.png",
  };
  const reg = await navigator.serviceWorker.getRegistration();
  if (reg) {
    await reg.showNotification(title, options);
    return;
  }
  // Mobile Chrome/Android bans the `new Notification()` constructor outright
  // (throws "Illegal constructor"); it only allows the SW path. With no SW
  // registration there is no banner to show, so skip rather than throw.
  try {
    new Notification(title, options);
  } catch {}
}

export async function unsubscribePush(): Promise<void> {
  const sub = await getPushSubscription();
  if (!sub) return;
  await unsubscribeNotifyPush({ endpoint: sub.endpoint }).catch(
    () => undefined,
  );
  await sub.unsubscribe().catch(() => undefined);
}
