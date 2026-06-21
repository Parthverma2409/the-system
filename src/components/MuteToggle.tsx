"use client";

import { useState } from "react";
import { isMuted, setMuted, playPing } from "@/lib/sound";

// Tiny 🔊/🔇 button — persists the System SFX preference to localStorage.
export default function MuteToggle() {
  // Lazy init (no setState-in-effect). SSR sees false; the emoji is the only
  // hydration-sensitive bit, so it's marked suppressHydrationWarning.
  const [muted, setMutedState] = useState(() => isMuted());

  function toggle() {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
    if (!next) playPing(); // confirm audio when unmuting
  }

  return (
    <button
      onClick={toggle}
      title={muted ? "Unmute System sounds" : "Mute System sounds"}
      className="border border-system/25 px-2 py-1 text-xs text-system/60 transition hover:border-system/60 hover:text-system"
      suppressHydrationWarning
    >
      <span suppressHydrationWarning>{muted ? "🔇" : "🔊"}</span>
    </button>
  );
}
