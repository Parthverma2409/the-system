"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  CATEGORY_STAT,
  progression,
  Difficulty,
  StatKey,
} from "@/lib/rpg/engine";
import { completeQuest } from "@/lib/rpg/award";
import { SysWindow, RewardsModal, type RewardItem } from "@/components/SystemUI";

export type Cadence = "daily" | "weekly" | "monthly" | "dungeon";
export type QuestStatus = "todo" | "done" | "failed";
type Category = keyof typeof CATEGORY_STAT;

export interface QuestRow {
  id: string;
  title: string;
  notes: string | null;
  category: string;
  cadence: Cadence;
  difficulty: Difficulty;
  status: QuestStatus;
  due_date: string | null;
  sort_order: number;
}

export interface QuestsInitial {
  userId: string;
  totalExp: number;
  dungeonsCleared: number;
  streak: number;
  stats: Record<StatKey, number>;
  earnedToday: number;
  quests: QuestRow[];
}

const TABS: { cadence: Cadence; label: string; icon: string; blurb: string }[] = [
  { cadence: "daily", label: "DAILY", icon: "☀", blurb: "Reset each day · Penalty Zone at midnight" },
  { cadence: "weekly", label: "WEEKLY", icon: "🗓", blurb: "Clear before the week ends" },
  { cadence: "monthly", label: "MONTHLY", icon: "🌙", blurb: "Long-horizon objectives" },
  { cadence: "dungeon", label: "DUNGEONS", icon: "🏰", blurb: "Projects · clearing one counts toward Rank-Up Trials" },
];

const DIFF_COLOR: Record<Difficulty, string> = {
  Easy: "#7CFFB2",
  Normal: "#36c5ff",
  Hard: "#ffd66b",
  Boss: "#ff5470",
};
const CATEGORIES: Category[] = ["health", "study", "routine", "focus", "social", "creative"];
const DIFFS: Difficulty[] = ["Easy", "Normal", "Hard", "Boss"];

interface DraftFields {
  title: string;
  category: Category;
  difficulty: Difficulty;
  due_date: string;
  notes: string;
}
const emptyDraft = (): DraftFields => ({ title: "", category: "routine", difficulty: "Normal", due_date: "", notes: "" });

export default function QuestsClient({ initial }: { initial: QuestsInitial }) {
  const supabase = useMemo(() => createClient(), []);
  const [quests, setQuests] = useState<QuestRow[]>(initial.quests);
  const [totalExp, setTotalExp] = useState(initial.totalExp);
  const [stats, setStats] = useState(initial.stats);
  const [earnedToday, setEarnedToday] = useState(initial.earnedToday);
  const [dungeonsCleared, setDungeonsCleared] = useState(initial.dungeonsCleared);

  const [tab, setTab] = useState<Cadence>("daily");
  const [rewards, setRewards] = useState<{ title: string; items: RewardItem[]; big: boolean } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<DraftFields>(emptyDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<DraftFields>(emptyDraft());

  const prog = useMemo(() => progression(totalExp), [totalExp]);
  const visible = quests.filter((q) => q.cadence === tab);
  const activeTab = TABS.find((t) => t.cadence === tab)!;

  function patchQuest(id: string, patch: Partial<QuestRow>) {
    setQuests((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  }

  async function complete(q: QuestRow) {
    if (q.status === "done" || busyId) return;
    setBusyId(q.id);
    patchQuest(q.id, { status: "done" }); // optimistic
    try {
      const res = await completeQuest(
        { userId: initial.userId, totalExp, earnedToday, streak: initial.streak, stats, dungeonsCleared },
        { id: q.id, category: q.category, difficulty: q.difficulty, cadence: q.cadence }
      );
      setTotalExp(res.newTotal);
      setEarnedToday((e) => e + res.gained);
      setStats((s) => ({ ...s, [res.stat]: res.newStatVal }));
      setDungeonsCleared(res.newDungeons);
      setRewards({ title: res.title, items: res.items, big: res.leveled || q.cadence === "dungeon" });
    } catch {
      patchQuest(q.id, { status: "todo" }); // roll back optimistic flip
    } finally {
      setBusyId(null);
    }
  }

  async function setStatus(q: QuestRow, status: QuestStatus) {
    if (busyId) return;
    setBusyId(q.id);
    patchQuest(q.id, { status });
    await supabase.from("quests").update({ status }).eq("id", q.id);
    if (status === "failed") {
      await supabase.from("quest_logs").insert({
        user_id: initial.userId,
        quest_id: q.id,
        status: "failed",
        exp_awarded: 0,
      });
    }
    setBusyId(null);
  }

  async function remove(q: QuestRow) {
    if (busyId) return;
    setBusyId(q.id);
    // Logs FK-reference the quest; clear them first so the delete can't error.
    await supabase.from("quest_logs").delete().eq("quest_id", q.id);
    await supabase.from("quests").delete().eq("id", q.id);
    setQuests((qs) => qs.filter((x) => x.id !== q.id));
    setBusyId(null);
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const title = draft.title.trim();
    if (!title) return;
    const { data } = await supabase
      .from("quests")
      .insert({
        user_id: initial.userId,
        title,
        notes: draft.notes.trim() || null,
        category: draft.category,
        difficulty: draft.difficulty,
        cadence: tab,
        due_date: draft.due_date || null,
        sort_order: quests.length,
      })
      .select("id,title,notes,category,cadence,difficulty,status,due_date,sort_order")
      .single();
    if (data) setQuests((qs) => [...qs, data as QuestRow]);
    setDraft(emptyDraft());
    setAdding(false);
  }

  function startEdit(q: QuestRow) {
    setEditingId(q.id);
    setEditDraft({
      title: q.title,
      category: (q.category as Category) ?? "routine",
      difficulty: q.difficulty,
      due_date: q.due_date ?? "",
      notes: q.notes ?? "",
    });
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    const title = editDraft.title.trim();
    if (!title) return;
    const patch = {
      title,
      notes: editDraft.notes.trim() || null,
      category: editDraft.category,
      difficulty: editDraft.difficulty,
      due_date: editDraft.due_date || null,
    };
    patchQuest(editingId, patch);
    await supabase.from("quests").update(patch).eq("id", editingId);
    setEditingId(null);
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      {rewards && (
        <RewardsModal title={rewards.title} items={rewards.items} big={rewards.big} onClose={() => setRewards(null)} />
      )}

      <header className="mb-5 text-center sys-in">
        <p className="text-[10px] tracking-[0.5em] text-system/55">⟢ THE SYSTEM ⟣</p>
        <h1 className="glow mt-1 text-2xl font-black tracking-wide text-system">QUEST BOARD</h1>
        <p className="mt-1 text-[10px] tracking-[0.3em] text-system/40">
          LEVEL {prog.level} · EXP TODAY {earnedToday} · DUNGEONS {dungeonsCleared}
        </p>
      </header>

      {/* Cadence tabs */}
      <div className="mb-4 grid grid-cols-4 gap-1.5">
        {TABS.map((t) => {
          const active = t.cadence === tab;
          const count = quests.filter((q) => q.cadence === t.cadence && q.status === "todo").length;
          return (
            <button
              key={t.cadence}
              onClick={() => { setTab(t.cadence); setAdding(false); setEditingId(null); }}
              className="flex flex-col items-center gap-0.5 border py-2 text-[10px] font-bold tracking-widest transition"
              style={{
                borderColor: active ? "var(--system)" : "rgba(54,197,255,.2)",
                background: active ? "rgba(54,197,255,.1)" : "transparent",
                color: active ? "var(--system)" : "color-mix(in srgb, var(--system) 50%, transparent)",
                boxShadow: active ? "0 0 12px rgba(54,197,255,.25)" : "none",
              }}
            >
              <span className="text-base leading-none">{t.icon}</span>
              {t.label}
              {count > 0 && <span className="text-[8px] text-gold">{count} OPEN</span>}
            </button>
          );
        })}
      </div>

      <SysWindow title={activeTab.label}>
        <p className="mb-3 text-center text-[10px] tracking-wider text-system/40">{activeTab.blurb}</p>

        {visible.length === 0 ? (
          <p className="py-6 text-center text-xs text-system/50">No {activeTab.label.toLowerCase()} quests yet.</p>
        ) : (
          <ul className="space-y-2">
            {visible.map((q) =>
              editingId === q.id ? (
                <li key={q.id}>
                  <QuestForm draft={editDraft} setDraft={setEditDraft} onSubmit={saveEdit} onCancel={() => setEditingId(null)} submitLabel="SAVE" cadence={tab} />
                </li>
              ) : (
                <li key={q.id}>
                  <QuestItem
                    q={q}
                    busy={busyId === q.id}
                    onComplete={() => complete(q)}
                    onFail={() => setStatus(q, "failed")}
                    onReset={() => setStatus(q, "todo")}
                    onEdit={() => startEdit(q)}
                    onDelete={() => remove(q)}
                  />
                </li>
              )
            )}
          </ul>
        )}

        {adding ? (
          <div className="mt-3">
            <QuestForm draft={draft} setDraft={setDraft} onSubmit={add} onCancel={() => setAdding(false)} submitLabel="ADD" cadence={tab} />
          </div>
        ) : (
          <button onClick={() => setAdding(true)} className="mt-3 w-full border border-dashed border-system/30 py-2 text-xs tracking-widest text-system/60 hover:border-system/60 hover:text-system">
            + NEW {activeTab.label === "DUNGEONS" ? "DUNGEON" : `${activeTab.label} QUEST`}
          </button>
        )}

        {tab === "daily" && (
          <p className="mt-3 text-center text-[10px] text-danger/70">⚠ Incomplete daily quests trigger a penalty at midnight.</p>
        )}
      </SysWindow>
    </main>
  );
}

function QuestItem({
  q, busy, onComplete, onFail, onReset, onEdit, onDelete,
}: {
  q: QuestRow;
  busy: boolean;
  onComplete: () => void;
  onFail: () => void;
  onReset: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const done = q.status === "done";
  const failed = q.status === "failed";
  const stat = CATEGORY_STAT[q.category] ?? "VIT";
  const borderColor = done ? "rgba(54,197,255,.12)" : failed ? "rgba(255,84,112,.4)" : "rgba(54,197,255,.3)";

  return (
    <div className="border px-3 py-2.5" style={{ borderColor, opacity: done ? 0.55 : 1 }}>
      <div className="flex items-center gap-3">
        <button
          onClick={onComplete}
          disabled={done || busy}
          title="Clear quest"
          className="flex h-5 w-5 shrink-0 items-center justify-center border text-xs disabled:cursor-default"
          style={{
            borderColor: failed ? "var(--danger)" : "var(--system)",
            background: done ? "var(--system)" : "transparent",
            color: done ? "#03060f" : "transparent",
            boxShadow: done ? "0 0 8px var(--system)" : "none",
          }}
        >
          ✓
        </button>
        <div className="min-w-0 flex-1">
          <p className={`truncate text-sm ${done ? "line-through" : ""} ${failed ? "text-danger/80" : "text-foreground"}`}>
            {q.title}
          </p>
          {(q.notes || q.due_date) && (
            <p className="truncate text-[10px] text-system/45">
              {q.due_date && <span className="text-gold/70">⏳ {q.due_date} </span>}
              {q.notes}
            </p>
          )}
        </div>
        <span className="shrink-0 px-1.5 py-0.5 text-[9px] font-bold tracking-wider" style={{ color: DIFF_COLOR[q.difficulty], border: `1px solid ${DIFF_COLOR[q.difficulty]}55` }}>
          {stat}·{q.difficulty.toUpperCase()}
        </span>
      </div>
      <div className="mt-2 flex justify-end gap-1.5 text-[10px] tracking-wider">
        {failed || done ? (
          <button onClick={onReset} disabled={busy} className="px-2 py-0.5 text-system/55 hover:text-system">↺ RESET</button>
        ) : (
          <button onClick={onFail} disabled={busy} className="px-2 py-0.5 text-danger/60 hover:text-danger">✗ FAIL</button>
        )}
        <button onClick={onEdit} disabled={busy} className="px-2 py-0.5 text-system/55 hover:text-system">✎ EDIT</button>
        <button onClick={onDelete} disabled={busy} className="px-2 py-0.5 text-system/40 hover:text-danger">🗑 DELETE</button>
      </div>
    </div>
  );
}

function QuestForm({
  draft, setDraft, onSubmit, onCancel, submitLabel, cadence,
}: {
  draft: DraftFields;
  setDraft: (d: DraftFields) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  submitLabel: string;
  cadence: Cadence;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-2 border border-system/20 p-3">
      <input
        autoFocus
        value={draft.title}
        onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        placeholder={cadence === "dungeon" ? "Dungeon (project) name…" : "Quest title…"}
        className="w-full border border-system/30 bg-black/40 px-2 py-1.5 text-sm outline-none focus:border-system/70"
      />
      <div className="flex gap-2">
        <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as Category })} className="flex-1 border border-system/30 bg-black/40 px-2 py-1.5 text-xs text-foreground">
          {CATEGORIES.map((c) => <option key={c} value={c} className="bg-bg">{c} → {CATEGORY_STAT[c]}</option>)}
        </select>
        <select value={draft.difficulty} onChange={(e) => setDraft({ ...draft, difficulty: e.target.value as Difficulty })} className="flex-1 border border-system/30 bg-black/40 px-2 py-1.5 text-xs text-foreground">
          {DIFFS.map((d) => <option key={d} value={d} className="bg-bg">{d}</option>)}
        </select>
      </div>
      {cadence !== "daily" && (
        <label className="block text-[10px] tracking-widest text-system/55">
          DUE DATE (optional)
          <input type="date" value={draft.due_date} onChange={(e) => setDraft({ ...draft, due_date: e.target.value })} className="mt-1 w-full border border-system/30 bg-black/40 px-2 py-1.5 text-xs text-foreground outline-none focus:border-system/70" />
        </label>
      )}
      <input value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Notes (optional)" className="w-full border border-system/30 bg-black/40 px-2 py-1.5 text-xs outline-none focus:border-system/70" />
      <div className="flex gap-2">
        <button type="submit" className="flex-1 border border-system/60 bg-system/10 py-1.5 text-xs font-bold tracking-wider text-system hover:bg-system/20">{submitLabel}</button>
        <button type="button" onClick={onCancel} className="border border-system/20 px-3 py-1.5 text-xs text-system/60">CANCEL</button>
      </div>
    </form>
  );
}
