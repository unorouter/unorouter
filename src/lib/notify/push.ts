"use client";

import { base64ToUint8 } from "@/lib/utils/base";
import { env } from "@/lib/config/env";

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
    (navigator as { standalone?: boolean }).standalone === true
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

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  return base64ToUint8(normalized);
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
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
  const res = await fetch(`${env.apiOrigin}/api/notify/vapid`);
  if (!res.ok) return null;
  const body = (await res.json()) as {
    success: boolean;
    data?: { key: string };
  };
  return body.success ? (body.data?.key ?? null) : null;
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
      applicationServerKey: urlBase64ToUint8Array(key) as BufferSource,
    });
  } catch {
    // AbortError "push service error": Brave with Google services for push
    // messaging disabled. Permission itself is granted, so in-page OS
    // banners still work; only closed-tab delivery is unavailable.
    return null;
  }
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
    await fetch(`${env.apiOrigin}/api/notify/subscription`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    }).catch(() => undefined);
    return true;
  }
  const json = sub.toJSON();
  const res = await fetch(`${env.apiOrigin}/api/notify/subscription`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: sub.endpoint,
      keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
      topics,
      locale,
    }),
  }).catch(() => null);
  if (!res?.ok) return false;
  const body = (await res.json().catch(() => null)) as {
    success?: boolean;
  } | null;
  return body?.success === true;
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
  await fetch(`${env.apiOrigin}/api/notify/subscription`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: sub.endpoint }),
  }).catch(() => undefined);
  await sub.unsubscribe().catch(() => undefined);
}
