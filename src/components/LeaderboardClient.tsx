"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { progression, type Rank } from "@/lib/rpg/engine";
import { SysWindow, RankBadge } from "@/components/SystemUI";

export interface LeaderRow {
  user_id: string;
  handle: string | null;
  hunter_name: string;
  rank: Rank;
  total_exp: number;
  weekly_exp: number;
  is_self: boolean;
}

type Sort = "weekly" | "level";

const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 20);

export default function LeaderboardClient({ initialRows }: { initialRows: LeaderRow[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<LeaderRow[]>(initialRows);
  const [sort, setSort] = useState<Sort>("weekly");
  const [handle, setHandle] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const ranked = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => (sort === "weekly" ? b.weekly_exp - a.weekly_exp : b.total_exp - a.total_exp));
    return copy;
  }, [rows, sort]);

  async function refresh() {
    const { data } = await supabase.rpc("leaderboard");
    if (data) setRows(data as LeaderRow[]);
  }

  async function addFriend(e: React.FormEvent) {
    e.preventDefault();
    const h = clean(handle);
    if (!h || busy) return;
    setBusy(true);
    setMsg(null);
    const { data, error } = await supabase.rpc("follow_by_handle", { p_handle: h });
    if (error) setMsg("Something went wrong — try again.");
    else if (data === "not_found") setMsg("No public hunter with that handle.");
    else if (data === "self") setMsg("That's you, Hunter.");
    else {
      setHandle("");
      setMsg("Added ✦");
      await refresh();
    }
    setBusy(false);
  }

  async function remove(row: LeaderRow) {
    if (row.is_self || busy) return;
    setBusy(true);
    await supabase.from("follows").delete().eq("followed_id", row.user_id);
    setRows((rs) => rs.filter((r) => r.user_id !== row.user_id));
    setBusy(false);
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <header className="mb-5 text-center sys-in">
        <p className="text-[10px] tracking-[0.5em] text-system/55">⟢ THE SYSTEM ⟣</p>
        <h1 className="glow mt-1 text-2xl font-black tracking-wide text-system">GUILD · LEADERBOARD</h1>
        <p className="mt-1 text-[10px] tracking-[0.3em] text-system/40">RANK YOURSELF AGAINST FELLOW HUNTERS</p>
      </header>

      <SysWindow title="ADD A HUNTER">
        <form onSubmit={addFriend} className="flex items-center gap-2">
          <span className="text-[11px] tracking-widest text-system/45">/h/</span>
          <input
            value={handle}
            onChange={(e) => setHandle(clean(e.target.value))}
            placeholder="their-handle"
            className="flex-1 border border-system/30 bg-black/40 px-2 py-1.5 text-sm outline-none focus:border-system/70"
          />
          <button type="submit" disabled={busy} className="shrink-0 border border-system/55 bg-system/10 px-3 py-1.5 text-[11px] font-bold tracking-widest text-system hover:bg-system/20 disabled:opacity-50">
            ADD
          </button>
        </form>
        {msg && <p className="mt-2 text-[10px] tracking-wider text-system/60">{msg}</p>}
        <p className="mt-2 text-[10px] leading-relaxed text-system/35">
          Add hunters by the handle on their public profile. They must have a public profile enabled.
        </p>
      </SysWindow>

      <div className="mt-4 mb-3 flex justify-center gap-2">
        {(["weekly", "level"] as Sort[]).map((s) => (
          <button
            key={s}
            onClick={() => setSort(s)}
            className="border px-4 py-1.5 text-[10px] font-bold tracking-widest transition"
            style={{
              borderColor: sort === s ? "var(--system)" : "rgba(54,197,255,.2)",
              background: sort === s ? "rgba(54,197,255,.1)" : "transparent",
              color: sort === s ? "var(--system)" : "color-mix(in srgb, var(--system) 50%, transparent)",
            }}
          >
            {s === "weekly" ? "THIS WEEK" : "ALL-TIME"}
          </button>
        ))}
      </div>

      <SysWindow title={sort === "weekly" ? "WEEKLY EXP" : "ALL-TIME LEVEL"}>
        <ol className="space-y-2">
          {ranked.map((r, i) => {
            const level = progression(r.total_exp).level;
            const top = i === 0;
            return (
              <li
                key={r.user_id}
                className="flex items-center gap-3 border px-3 py-2"
                style={{
                  borderColor: r.is_self ? "var(--gold)" : "rgba(54,197,255,.2)",
                  background: r.is_self ? "rgba(255,214,107,.06)" : top ? "rgba(54,197,255,.06)" : "transparent",
                }}
              >
                <span className="w-6 shrink-0 text-center text-sm font-black" style={{ color: top ? "var(--gold)" : "var(--system)" }}>
                  {i + 1}
                </span>
                <span className="scale-[0.55] -mx-3"><RankBadge rank={r.rank} /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground">
                    {r.hunter_name} {r.is_self && <span className="text-[9px] tracking-widest text-gold">YOU</span>}
                  </p>
                  <p className="text-[10px] tracking-wider text-system/45">
                    LV {level} · {r.rank}-RANK{r.handle ? ` · /h/${r.handle}` : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold tabular-nums text-system">
                    {(sort === "weekly" ? r.weekly_exp : r.total_exp).toLocaleString()}
                  </p>
                  <p className="text-[9px] tracking-widest text-system/40">{sort === "weekly" ? "EXP/WK" : "TOTAL"}</p>
                </div>
                {!r.is_self && (
                  <button onClick={() => remove(r)} disabled={busy} title="Remove" className="shrink-0 text-system/30 hover:text-danger">
                    ✕
                  </button>
                )}
              </li>
            );
          })}
        </ol>
        {ranked.length <= 1 && (
          <p className="mt-3 text-center text-[11px] text-system/45">
            Add some hunters above to start a rivalry. Share your own handle so others can add you back.
          </p>
        )}
      </SysWindow>
    </main>
  );
}
