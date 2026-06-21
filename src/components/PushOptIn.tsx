"use client";

import { useEffect, useState } from "react";
import { SysWindow } from "@/components/SystemUI";
import { currentStatus, enablePush, disablePush, pushSupported, type PushStatus } from "@/lib/push/client";

// "Enable reminders, Hunter." — subscribes this device to Web Push so the System
// can warn before the Penalty Zone, announce new daily quests, and fire trial
// alerts (P9 / PLAN D3). iOS only delivers push once installed to home screen.
export default function PushOptIn({ userId }: { userId: string }) {
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [busy, setBusy] = useState(false);
  // iOS standalone check — Web Push needs home-screen install there. Computed
  // once at mount (lazy init) so it never triggers a cascading effect render.
  const [installed] = useState(() => {
    if (typeof window === "undefined") return true;
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS-only Safari flag
      window.navigator.standalone === true;
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    return !isIOS || standalone;
  });

  useEffect(() => {
    currentStatus().then(setStatus);
  }, []);

  if (status === null) return null;

  async function toggle() {
    if (busy) return;
    setBusy(true);
    try {
      if (status === "granted") {
        await disablePush(userId);
        setStatus("default");
      } else {
        setStatus(await enablePush(userId));
      }
    } finally {
      setBusy(false);
    }
  }

  if (status === "unsupported" || !pushSupported()) {
    return (
      <SysWindow title="REMINDERS">
        <p className="text-xs text-system/55">
          This device can&apos;t receive System alerts. Install the app and use a modern browser to enable reminders.
        </p>
      </SysWindow>
    );
  }

  const on = status === "granted";
  const denied = status === "denied";

  return (
    <SysWindow title="REMINDERS">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-wide text-foreground">
            {on ? "✓ Alerts active" : "Enable System alerts"}
          </p>
          <p className="mt-0.5 text-[10px] leading-relaxed text-system/50">
            Daily-quest reset, Penalty Zone warnings, and Rank-Up Trial notices.
          </p>
        </div>
        <button
          onClick={toggle}
          disabled={busy || denied}
          className="shrink-0 border px-3 py-1.5 text-[11px] font-bold tracking-widest transition disabled:opacity-40"
          style={{
            borderColor: on ? "var(--danger)" : "var(--system)",
            color: on ? "var(--danger)" : "var(--system)",
            boxShadow: on ? "none" : "0 0 12px color-mix(in srgb, var(--system) 35%, transparent)",
          }}
        >
          {busy ? "…" : on ? "DISABLE" : "ENABLE"}
        </button>
      </div>
      {denied && (
        <p className="mt-2 text-[10px] text-danger/80">
          ⚠ Notifications are blocked in your browser settings — re-allow them for this site to enable.
        </p>
      )}
      {!installed && (
        <p className="mt-2 text-[10px] text-gold/80">
          📲 On iPhone, add this app to your Home Screen first — iOS only delivers push to installed apps.
        </p>
      )}
    </SysWindow>
  );
}
