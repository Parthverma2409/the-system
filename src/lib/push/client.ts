"use client";

import { createClient } from "@/lib/supabase/client";

// VAPID keys are base64url; the browser wants a Uint8Array of the raw bytes.
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function bufToB64Url(buf: ArrayBuffer | null): string {
  if (!buf) return "";
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export type PushStatus = "unsupported" | "denied" | "default" | "granted";

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch {
    return null;
  }
}

export async function currentStatus(): Promise<PushStatus> {
  if (!pushSupported()) return "unsupported";
  return Notification.permission as PushStatus;
}

// Ask permission, subscribe via PushManager, and persist the subscription so the
// edge function can reach this device. Returns the resulting status.
export async function enablePush(userId: string): Promise<PushStatus> {
  if (!pushSupported()) return "unsupported";
  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapid) throw new Error("Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission as PushStatus;

  const reg = (await registerServiceWorker()) ?? (await navigator.serviceWorker.ready);
  const existing = await reg.pushManager.getSubscription();
  const sub =
    existing ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapid) as BufferSource,
    }));

  const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  const endpoint = json.endpoint ?? sub.endpoint;
  const p256dh = json.keys?.p256dh ?? bufToB64Url(sub.getKey("p256dh"));
  const auth = json.keys?.auth ?? bufToB64Url(sub.getKey("auth"));

  const supabase = createClient();
  // onConflict endpoint → re-subscribing the same device just refreshes the row.
  await supabase
    .from("push_subscriptions")
    .upsert(
      { user_id: userId, endpoint, p256dh, auth, user_agent: navigator.userAgent },
      { onConflict: "endpoint" }
    );

  return "granted";
}

export async function disablePush(userId: string): Promise<void> {
  const supabase = createClient();
  if ("serviceWorker" in navigator) {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      await sub.unsubscribe();
      return;
    }
  }
  // No live subscription object — clear any rows we have for this user as a fallback.
  await supabase.from("push_subscriptions").delete().eq("user_id", userId);
}
