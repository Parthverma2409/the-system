"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { StatKey, STAT_LABELS, statRank } from "@/lib/rpg/engine";

const RANK_COLOR: Record<string, string> = {
  E: "#8aa0b5", D: "#36c5ff", C: "#48e0c0", B: "#7CFFB2", A: "#ffd66b", S: "#b07bff",
};

// Header + Ability-Point spender for a stat detail page. Spending 1 AP raises the
// stat by 1 (manual agency on top of auto-gain), records a stat_history point, and
// tracks `spent` so available AP = earned − spent.
export default function StatTrainer({
  userId,
  statKey,
  initialValue,
  initialSpent,
  earned,
}: {
  userId: string;
  statKey: StatKey;
  initialValue: number;
  initialSpent: number;
  earned: number;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [value, setValue] = useState(initialValue);
  const [spent, setSpent] = useState(initialSpent);
  const [busy, setBusy] = useState(false);

  const available = Math.max(0, earned - spent);
  const rank = statRank(value);
  const color = RANK_COLOR[rank];

  async function boost() {
    if (available <= 0 || busy) return;
    setBusy(true);
    const newValue = value + 1;
    const newSpent = spent + 1;
    setValue(newValue);
    setSpent(newSpent);
    try {
      await Promise.all([
        supabase.from("ability_points").upsert({ user_id: userId, spent: newSpent }, { onConflict: "user_id" }),
        supabase.from("stats").update({ value: newValue }).eq("user_id", userId).eq("stat_key", statKey),
        supabase.from("stat_history").insert({ user_id: userId, stat_key: statKey, value: newValue }),
      ]);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-5">
      <div
        className="flex h-20 w-20 shrink-0 flex-col items-center justify-center"
        style={{
          color,
          border: `1.5px solid ${color}`,
          background: "rgba(5,12,26,.7)",
          boxShadow: `0 0 16px ${color}55, inset 0 0 16px ${color}22`,
          clipPath: "polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)",
        }}
      >
        <span className="text-3xl font-black" style={{ textShadow: `0 0 10px ${color}` }}>{value}</span>
        <span className="text-[9px] tracking-widest">{rank}-RANK</span>
      </div>

      <div className="flex-1">
        <p className="text-[10px] tracking-widest text-system/55">{statKey}</p>
        <p className="text-lg font-bold text-foreground">{STAT_LABELS[statKey]}</p>
        <div className="mt-2 flex items-center gap-3">
          <button
            onClick={boost}
            disabled={available <= 0 || busy}
            className="border px-3 py-1.5 text-xs font-bold tracking-widest transition hover:bg-gold/10 disabled:opacity-40"
            style={{ borderColor: "var(--gold)", color: "var(--gold)", boxShadow: "0 0 12px rgba(255,214,107,.25)" }}
          >
            + BOOST · 1 AP
          </button>
          <span className="text-[11px] tracking-wider text-system/60">
            {available} AP available
          </span>
        </div>
      </div>
    </div>
  );
}
