"use client";

import { useEffect } from "react";

// Registers the service worker on app load so the System works offline (cached
// app shell) and can receive Web Push. Safe no-op where unsupported.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
  }, []);
  return null;
}
