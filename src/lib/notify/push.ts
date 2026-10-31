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

// getRegistration, NOT .ready: with no SW registered (dev server) .ready never
// resolves and hangs every caller.
export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return null;
  try {
    return await reg.pushManager.getSubscription();
  } catch {
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
    return null;
  }
}

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

const PUSH_SYNC_KEY = "notify-push-sync";
const PUSH_SYNC_TTL_MS = 6 * 60 * 60 * 1000;

// An unchanged subscription is not re-sent within the TTL: the gateway rate limits subscribe per IP.
function pushSyncFresh(sig: string): boolean {
  try {
    const saved: unknown = JSON.parse(
      localStorage.getItem(PUSH_SYNC_KEY) ?? "null",
    );
    if (!saved || typeof saved !== "object") return false;
    if (!("sig" in saved) || !("at" in saved)) return false;
    return (
      saved.sig === sig && Date.now() - Number(saved.at) < PUSH_SYNC_TTL_MS
    );
  } catch {
    return false;
  }
}

function rememberPushSync(sig: string | null) {
  try {
    if (sig)
      localStorage.setItem(
        PUSH_SYNC_KEY,
        JSON.stringify({ sig, at: Date.now() }),
      );
    else localStorage.removeItem(PUSH_SYNC_KEY);
  } catch {}
}

export async function syncPushTopics(
  topics: string[],
  locale: string,
): Promise<boolean> {
  const sub = await getPushSubscription();
  if (!sub) return false;
  const sig = JSON.stringify([sub.endpoint, [...topics].sort(), locale]);
  if (pushSyncFresh(sig)) return true;
  if (topics.length === 0) {
    await unsubscribeNotifyPush({ endpoint: sub.endpoint }).catch(
      () => undefined,
    );
    rememberPushSync(sig);
    return true;
  }
  const json = sub.toJSON();
  const res = await subscribeNotifyPush({
    endpoint: sub.endpoint,
    keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" },
    topics,
    locale,
  }).catch(() => null);
  const ok = res?.data.success === true;
  rememberPushSync(ok ? sig : null);
  return ok;
}

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
  // Mobile Chrome/Android bans `new Notification()` ("Illegal constructor").
  try {
    new Notification(title, options);
  } catch {}
}

export async function unsubscribePush(): Promise<void> {
  rememberPushSync(null);
  const sub = await getPushSubscription();
  if (!sub) return;
  await unsubscribeNotifyPush({ endpoint: sub.endpoint }).catch(
    () => undefined,
  );
  await sub.unsubscribe().catch(() => undefined);
}
