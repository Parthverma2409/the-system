"use client";

import { useEffect } from "react";

// Full-screen cinematic flash for the big beats (PLAN §6). "level" is the blue
// System flash; "rank" is the larger gold/Monarch promotion. Auto-dismisses, or
// click to skip. Visuals only — sound + haptics are fired by the caller.
export interface CinematicData {
  type: "level" | "rank";
  title: string; // e.g. "LEVEL UP" / "RANK UP"
  sub: string; // e.g. "12 → 13" / "D-RANK ATTAINED"
}

export default function Cinematic({ data, onDone }: { data: CinematicData; onDone: () => void }) {
  const isRank = data.type === "rank";
  useEffect(() => {
    const t = setTimeout(onDone, isRank ? 2600 : 1700);
    return () => clearTimeout(t);
  }, [onDone, isRank]);

  const accent = isRank ? "var(--gold)" : "var(--system)";

  return (
    <div
      className="cine-overlay fixed inset-0 z-[60] flex flex-col items-center justify-center"
      onClick={onDone}
      style={{ background: "radial-gradient(circle at 50% 50%, rgba(0,0,0,.55), rgba(0,0,0,.92))" }}
    >
      <div className="cine-flash pointer-events-none absolute inset-0" style={{ background: accent }} />
      {isRank && <div className="cine-rays pointer-events-none absolute inset-0" />}
      <p
        className="cine-sub text-[11px] tracking-[0.6em]"
        style={{ color: accent, opacity: 0.7 }}
      >
        ⟢ THE SYSTEM ⟣
      </p>
      <h1
        className="cine-title mt-2 text-center text-5xl font-black tracking-[0.15em] sm:text-7xl"
        style={{ color: accent, textShadow: `0 0 30px ${accent}, 0 0 70px ${accent}` }}
      >
        {data.title}
      </h1>
      <p
        className="cine-sub2 mt-3 text-lg font-bold tracking-[0.3em]"
        style={{ color: "var(--foreground)", textShadow: `0 0 12px ${accent}` }}
      >
        {data.sub}
      </p>
    </div>
  );
}
