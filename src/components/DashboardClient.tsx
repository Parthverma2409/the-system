"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  awardExp,
  progression,
  deriveVitals,
  abilityPointsEarned,
  AP_PER_LEVEL,
  STAT_KEYS,
  STAT_LABELS,
  CATEGORY_STAT,
  Difficulty,
  StatKey,
  Rank,
  nextTrial,
  trialAvailable,
  HunterState,
} from "@/lib/rpg/engine";
import { ExpBar, RankBadge, StatRadar, SysWindow, VitalBars, RewardsModal, type RewardItem } from "@/components/SystemUI";
import Cinematic, { type CinematicData } from "@/components/Cinematic";
import MuteToggle from "@/components/MuteToggle";
import { playClear, playLevelUp, playRankUp, vibrate } from "@/lib/sound";

type Category = keyof typeof CATEGORY_STAT;

interface QuestRow {
  id: string;
  title: string;
  category: string;
  difficulty: Difficulty;
  status: "todo" | "done" | "failed";
}

export interface InitialData {
  userId: string;
  hunterName: string;
  totalExp: number;
  rank: Rank;
  dungeonsCleared: number;
  stats: Record<StatKey, number>;
  streak: number;
  apSpent: number;
  quests: QuestRow[];
}

const DIFF_COLOR: Record<Difficulty, string> = {
  Easy: "#7CFFB2",
  Normal: "#36c5ff",
  Hard: "#ffd66b",
  Boss: "#ff5470",
};
const CATEGORIES: Category[] = ["health", "study", "routine", "focus", "social", "creative"];
const DIFFS: Difficulty[] = ["Easy", "Normal", "Hard", "Boss"];

// Title granted on reaching each rank (the S-Rank one is the Shadow Monarch payoff).
const RANK_TITLE: Record<Rank, string> = {
  E: "Awakened",
  D: "Awakened Hunter",
  C: "Elite Hunter",
  B: "Veteran Hunter",
  A: "National-Level Hunter",
  S: "Shadow Monarch",
};

export default function DashboardClient({ initial }: { initial: InitialData }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [quests, setQuests] = useState<QuestRow[]>(initial.quests);
  const [totalExp, setTotalExp] = useState(initial.totalExp);
  const [stats, setStats] = useState(initial.stats);
  const [rank, setRank] = useState<Rank>(initial.rank);
  const [promoting, setPromoting] = useState(false);
  const [earnedToday, setEarnedToday] = useState(0);
  const [rewards, setRewards] = useState<{ title: string; items: RewardItem[]; big: boolean } | null>(null);
  const [pendingRewards, setPendingRewards] = useState<{ title: string; items: RewardItem[]; big: boolean } | null>(null);
  const [cinematic, setCinematic] = useState<CinematicData | null>(null);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCat, setNewCat] = useState<Category>("routine");
  const [newDiff, setNewDiff] = useState<Difficulty>("Normal");

  const prog = useMemo(() => progression(totalExp), [totalExp]);
  const streak = initial.streak;

  const vitals = useMemo(() => {
    const done = quests.filter((q) => q.status === "done");
    const total = quests.length;
    const focusClearedToday = done.filter((q) => q.category === "study" || q.category === "focus").length;
    const heavyClearedToday = done.filter((q) => q.difficulty === "Hard" || q.difficulty === "Boss").length;
    return deriveVitals({
      level: prog.level,
      stats,
      streak,
      completionRate: total === 0 ? 0.6 : done.length / total,
      focusClearedToday,
      heavyClearedToday,
    });
  }, [quests, stats, prog.level, streak]);

  const apAvailable = Math.max(0, abilityPointsEarned(prog.level) - initial.apSpent);

  const hunter: HunterState = {
    rank,
    level: prog.level,
    streak,
    stats,
    dungeonsCleared: initial.dungeonsCleared,
  };
  const trial = nextTrial(hunter.rank);
  const canPromote = trialAvailable(hunter);

  async function attemptTrial() {
    if (!trial || !canPromote || promoting) return;
    setPromoting(true);
    const target = trial.rank;
    const title = RANK_TITLE[target];

    playRankUp();
    vibrate([0, 60, 40, 140]);
    setPendingRewards({
      title: "PROMOTION",
      items: [
        { label: "RANK", value: `${rank} → ${target}`, color: "var(--gold)" },
        { label: "TITLE EARNED", value: title, color: "var(--gold)" },
      ],
      big: true,
    });
    setCinematic({ type: "rank", title: "RANK UP", sub: `${target}-RANK ATTAINED` });
    setRank(target); // optimistic — flips the badge (and Monarch skin at S)

    await Promise.all([
      supabase.from("profiles").update({ rank: target }).eq("id", initial.userId),
      supabase.from("rank_trials").insert({
        user_id: initial.userId,
        target_rank: target,
        status: "passed",
        passed_at: new Date().toISOString(),
      }),
      supabase.from("titles").upsert({ user_id: initial.userId, title_key: title }, { onConflict: "user_id,title_key" }),
    ]);
    setPromoting(false);
  }

  async function clearQuest(q: QuestRow) {
    if (q.status === "done") return;
    const gained = awardExp({ difficulty: q.difficulty, streak, earnedToday, level: prog.level });
    const stat = CATEGORY_STAT[q.category] ?? "VIT";
    const before = prog.level;
    const newTotal = totalExp + gained;
    const after = progression(newTotal).level;
    const leveled = after > before;
    const newStatVal = (stats[stat] ?? 0) + 1;

    // optimistic UI
    setQuests((qs) => qs.map((x) => (x.id === q.id ? { ...x, status: "done" } : x)));
    setTotalExp(newTotal);
    setEarnedToday((e) => e + gained);
    setStats((s) => ({ ...s, [stat]: newStatVal }));

    const items: RewardItem[] = [
      { label: "EXP GAINED", value: `+${gained}` },
      { label: STAT_LABELS[stat], value: `+1 ${stat}`, color: "var(--system-bright)" },
    ];
    if (leveled) {
      items.push({ label: "LEVEL", value: `${before} → ${after}`, color: "var(--gold)" });
      items.push({ label: "ABILITY POINTS", value: `+${AP_PER_LEVEL * (after - before)}`, color: "var(--gold)" });
    }
    const payload = { title: leveled ? "LEVEL UP" : "QUEST REWARDS", items, big: leveled };
    if (leveled) {
      playLevelUp();
      vibrate([0, 40, 50, 90]);
      setPendingRewards(payload);
      setCinematic({ type: "level", title: "LEVEL UP", sub: `${before} → ${after}` });
    } else {
      playClear();
      vibrate(20);
      setRewards(payload);
    }

    // persist
    await Promise.all([
      supabase.from("quests").update({ status: "done" }).eq("id", q.id),
      supabase.from("quest_logs").insert({
        user_id: initial.userId,
        quest_id: q.id,
        status: "done",
        exp_awarded: gained,
      }),
      supabase.from("profiles").update({ total_exp: newTotal }).eq("id", initial.userId),
      supabase.from("stats").update({ value: newStatVal }).eq("user_id", initial.userId).eq("stat_key", stat),
      supabase.from("stat_history").insert({ user_id: initial.userId, stat_key: stat, value: newStatVal }),
    ]);
  }

  async function addQuest(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const { data } = await supabase
      .from("quests")
      .insert({
        user_id: initial.userId,
        title: newTitle.trim(),
        category: newCat,
        difficulty: newDiff,
        cadence: "daily",
        sort_order: quests.length,
      })
      .select()
      .single();
    if (data) {
      setQuests((qs) => [...qs, { id: data.id, title: data.title, category: data.category, difficulty: data.difficulty, status: "todo" }]);
    }
    setNewTitle("");
    setAdding(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const clearedCount = quests.filter((q) => q.status === "done").length;

  return (
    <main className={`mx-auto w-full max-w-3xl px-4 py-8 ${hunter.rank === "S" ? "monarch" : ""}`}>
      {cinematic && (
        <Cinematic
          data={cinematic}
          onDone={() => {
            setCinematic(null);
            if (pendingRewards) {
              setRewards(pendingRewards);
              setPendingRewards(null);
            }
          }}
        />
      )}

      {rewards && (
        <RewardsModal
          title={rewards.title}
          items={rewards.items}
          big={rewards.big}
          onClose={() => setRewards(null)}
        />
      )}

      <header className="mb-5 text-center sys-in">
        <p className="text-[10px] tracking-[0.5em] text-system/55">⟢ THE SYSTEM ⟣</p>
        <h1 className="glow mt-1 text-3xl font-black tracking-wide text-system">HUNTER LOG</h1>
        <p className="mt-1 text-[10px] tracking-[0.3em] text-system/40">
          {new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" }).toUpperCase()}
        </p>
      </header>

      <SysWindow title="STATUS" className="mb-5">
        <div className="flex items-center gap-5">
          <RankBadge rank={hunter.rank} />
          <div className="flex-1">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] tracking-widest text-system/55">HUNTER</p>
                <p className="text-xl font-bold text-foreground">{initial.hunterName}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] tracking-widest text-system/55">LEVEL</p>
                <p className="glow text-3xl font-black text-system">{prog.level}</p>
              </div>
            </div>
            <div className="mt-3">
              <ExpBar pct={prog.pct} into={prog.intoLevel} toNext={prog.toNext} />
            </div>
          </div>
        </div>

        <div className="mt-4 border-t border-system/15 pt-3">
          <VitalBars vitals={vitals} />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px]">
          <Stat label="STREAK" value={`🔥 ${streak}d`} color="var(--gold)" />
          <Stat label="CLEARED" value={`${clearedCount}/${quests.length}`} color="var(--system)" />
          <Stat label="EXP TODAY" value={`${earnedToday}`} color="var(--system)" />
        </div>
      </SysWindow>

      {trial && (
        <div className="sys-window sys-nodes sys-in mb-5" style={{ animationDelay: "80ms", borderColor: canPromote ? "rgba(255,214,107,.6)" : undefined }}>
          <div className="sys-header" style={{ color: canPromote ? "var(--gold)" : undefined }}>
            [ {canPromote ? "RANK-UP TRIAL AVAILABLE" : `NEXT RANK · ${trial.rank}`} ]
          </div>
          <div className="p-4 text-sm">
            <p className="text-system/75">▸ Requirement — {trial.describe}</p>
            {canPromote ? (
              <>
                <p className="mt-2 text-xs text-gold/80">All conditions met. The gate to {trial.rank}-Rank stands open.</p>
                <button
                  onClick={attemptTrial}
                  disabled={promoting}
                  className="mt-3 w-full border py-2.5 text-xs font-black tracking-[0.3em] transition hover:bg-gold/10 disabled:opacity-50"
                  style={{ borderColor: "var(--gold)", color: "var(--gold)", boxShadow: "0 0 16px rgba(255,214,107,.35)" }}
                >
                  {promoting ? "ASCENDING…" : `⚔ ATTEMPT RANK-UP TRIAL → ${trial.rank}`}
                </button>
              </>
            ) : (
              <p className="mt-2 text-xs italic text-system/45">
                &ldquo;You are strong, but the System still ranks you {hunter.rank}. Power outpaces recognition.&rdquo;
              </p>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <SysWindow title="STATS" delay={120}>
          <div className="mb-2 flex items-center justify-between border border-system/20 bg-system/5 px-3 py-1.5 text-[10px] tracking-widest">
            <span className="text-system/60">AVAILABLE ABILITY POINTS</span>
            <span className="font-bold text-gold" style={{ textShadow: "0 0 8px rgba(255,214,107,.5)" }}>
              {apAvailable}
            </span>
          </div>
          <StatRadar stats={stats} />
          <div className="mt-3 grid grid-cols-2 gap-1.5">
            {STAT_KEYS.map((k) => (
              <Link
                key={k}
                href={`/stats/${k.toLowerCase()}`}
                className="flex items-center justify-between border border-system/15 px-2.5 py-1.5 text-xs transition hover:border-system/50 hover:bg-system/5"
              >
                <span className="tracking-wider text-system/70">{k}</span>
                <span className="font-bold text-foreground">{stats[k] ?? 0} <span className="text-system/40">›</span></span>
              </Link>
            ))}
          </div>
        </SysWindow>

        <SysWindow title="DAILY QUEST · PENALTY ZONE" delay={160}>
          {quests.length === 0 && (
            <p className="py-6 text-center text-xs text-system/50">No quests yet. Add your first below.</p>
          )}
          <ul className="space-y-2">
            {quests.map((q) => (
              <li key={q.id}>
                <button
                  onClick={() => clearQuest(q)}
                  disabled={q.status === "done"}
                  className="group flex w-full items-center gap-3 border px-3 py-2.5 text-left transition hover:bg-system/5"
                  style={{ borderColor: q.status === "done" ? "rgba(54,197,255,.12)" : "rgba(54,197,255,.3)", opacity: q.status === "done" ? 0.5 : 1 }}
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center border text-xs" style={{ borderColor: "var(--system)", background: q.status === "done" ? "var(--system)" : "transparent", color: q.status === "done" ? "#03060f" : "transparent", boxShadow: q.status === "done" ? "0 0 8px var(--system)" : "none" }}>
                    ✓
                  </span>
                  <span className={`flex-1 text-sm ${q.status === "done" ? "line-through" : ""}`}>{q.title}</span>
                  <span className="shrink-0 px-1.5 py-0.5 text-[9px] font-bold tracking-wider" style={{ color: DIFF_COLOR[q.difficulty], border: `1px solid ${DIFF_COLOR[q.difficulty]}55` }}>
                    {CATEGORY_STAT[q.category] ?? "VIT"}·{q.difficulty.toUpperCase()}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {adding ? (
            <form onSubmit={addQuest} className="mt-3 space-y-2 border border-system/20 p-3">
              <input autoFocus value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="New quest title..." className="w-full border border-system/30 bg-black/40 px-2 py-1.5 text-sm outline-none focus:border-system/70" />
              <div className="flex gap-2">
                <select value={newCat} onChange={(e) => setNewCat(e.target.value as Category)} className="flex-1 border border-system/30 bg-black/40 px-2 py-1.5 text-xs text-foreground">
                  {CATEGORIES.map((c) => <option key={c} value={c} className="bg-bg">{c} → {CATEGORY_STAT[c]}</option>)}
                </select>
                <select value={newDiff} onChange={(e) => setNewDiff(e.target.value as Difficulty)} className="flex-1 border border-system/30 bg-black/40 px-2 py-1.5 text-xs text-foreground">
                  {DIFFS.map((d) => <option key={d} value={d} className="bg-bg">{d}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 border border-system/60 bg-system/10 py-1.5 text-xs font-bold tracking-wider text-system hover:bg-system/20">ADD</button>
                <button type="button" onClick={() => setAdding(false)} className="border border-system/20 px-3 py-1.5 text-xs text-system/60">CANCEL</button>
              </div>
            </form>
          ) : (
            <button onClick={() => setAdding(true)} className="mt-3 w-full border border-dashed border-system/30 py-2 text-xs tracking-widest text-system/60 hover:border-system/60 hover:text-system">
              + NEW QUEST
            </button>
          )}
          <p className="mt-3 text-center text-[10px] text-danger/70">⚠ Incomplete quests trigger a penalty at midnight.</p>
        </SysWindow>
      </div>

      <div className="mt-8 flex items-center justify-between text-[10px] tracking-wider text-system/35">
        <span>SYNCED TO CLOUD · {initial.hunterName.toUpperCase()}</span>
        <div className="flex items-center gap-2">
          <MuteToggle />
          <button onClick={signOut} className="border border-system/20 px-3 py-1 text-system/55 hover:border-danger/50 hover:text-danger">
            SIGN OUT
          </button>
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="border border-system/20 py-1.5">
      <p className="text-system/50">{label}</p>
      <p className="font-bold" style={{ color }}>{value}</p>
    </div>
  );
}
