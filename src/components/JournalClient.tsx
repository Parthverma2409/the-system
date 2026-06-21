"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SysWindow } from "@/components/SystemUI";
import PushOptIn from "@/components/PushOptIn";

export interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD
  body: string;
  mood: string | null;
}

export interface ClearedQuest {
  title: string;
  category: string;
}

// Mood palette — a Hunter's read-out of their inner state for the day.
const MOODS = [
  { key: "energized", icon: "⚡", label: "ENERGIZED", color: "#7CFFB2" },
  { key: "focused", icon: "🔥", label: "FOCUSED", color: "#36c5ff" },
  { key: "calm", icon: "🌿", label: "CALM", color: "#48e0c0" },
  { key: "neutral", icon: "◐", label: "NEUTRAL", color: "#8aa0b5" },
  { key: "drained", icon: "🌫", label: "DRAINED", color: "#ffd66b" },
  { key: "low", icon: "🌧", label: "LOW", color: "#ff5470" },
] as const;

const MOOD_BY_KEY = Object.fromEntries(MOODS.map((m) => [m.key, m]));

// Category tint for the cleared-quest chips, matching the stat colours used
// elsewhere in the System.
const CAT_COLOR: Record<string, string> = {
  health: "#ff8a8a",
  study: "#9fbcff",
  routine: "#7CFFB2",
  focus: "#36c5ff",
  social: "#ffd66b",
  creative: "#b07bff",
};

function localToday() {
  const d = new Date();
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 10);
}

function formatDate(date: string) {
  const d = new Date(`${date}T00:00:00`);
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function JournalClient({
  userId,
  initialEntries,
  clearedByDate,
}: {
  userId: string;
  initialEntries: JournalEntry[];
  clearedByDate: Record<string, ClearedQuest[]>;
}) {
  const supabase = useMemo(() => createClient(), []);
  const today = useMemo(() => localToday(), []);

  const [entries, setEntries] = useState<JournalEntry[]>(initialEntries);
  const todayEntry = entries.find((e) => e.date === today);

  const [body, setBody] = useState(todayEntry?.body ?? "");
  const [mood, setMood] = useState<string | null>(todayEntry?.mood ?? null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const todayCleared = clearedByDate[today] ?? [];
  const pastEntries = entries.filter((e) => e.date !== today);

  async function save() {
    if (busy) return;
    const trimmed = body.trim();
    if (!trimmed && !mood) return;
    setBusy(true);
    setSaved(false);
    const { data } = await supabase
      .from("journal")
      .upsert(
        { user_id: userId, date: today, body: trimmed, mood },
        { onConflict: "user_id,date" }
      )
      .select("id,date,body,mood")
      .single();
    if (data) {
      setEntries((prev) => {
        const rest = prev.filter((e) => e.date !== today);
        return [data as JournalEntry, ...rest].sort((a, b) => (a.date < b.date ? 1 : -1));
      });
      setSaved(true);
    }
    setBusy(false);
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <header className="mb-5 text-center sys-in">
        <p className="text-[10px] tracking-[0.5em] text-system/55">⟢ THE SYSTEM ⟣</p>
        <h1 className="glow mt-1 text-2xl font-black tracking-wide text-system">HUNTER&apos;S LOG</h1>
        <p className="mt-1 text-[10px] tracking-[0.3em] text-system/40">DATE-BASED REFLECTION · MOOD · DEEDS</p>
      </header>

      <div className="mb-5">
        <PushOptIn userId={userId} />
      </div>

      {/* Today's entry editor */}
      <SysWindow title={`TODAY · ${formatDate(today)}`}>
        <div className="mb-3">
          <p className="mb-2 text-[10px] tracking-[0.3em] text-system/50">STATE OF MIND</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {MOODS.map((m) => {
              const active = mood === m.key;
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setMood(active ? null : m.key)}
                  className="flex flex-col items-center gap-1 border px-1 py-2 text-center transition"
                  style={{
                    borderColor: active ? m.color : "rgba(54,197,255,.2)",
                    background: active ? `${m.color}1a` : "transparent",
                    boxShadow: active ? `0 0 12px ${m.color}55` : "none",
                  }}
                >
                  <span className="text-lg leading-none">{m.icon}</span>
                  <span
                    className="text-[8px] tracking-widest"
                    style={{ color: active ? m.color : "color-mix(in srgb, var(--system) 50%, transparent)" }}
                  >
                    {m.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <textarea
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            setSaved(false);
          }}
          rows={6}
          placeholder="Record the day, Hunter. What did you face? What did you learn?"
          className="w-full resize-y border border-system/30 bg-black/40 px-3 py-2 text-sm leading-relaxed text-foreground outline-none focus:border-system/70"
        />

        {todayCleared.length > 0 && (
          <div className="mt-3 border-t border-system/15 pt-3">
            <p className="mb-2 text-[10px] tracking-[0.3em] text-system/50">CLEARED TODAY</p>
            <div className="flex flex-wrap gap-1.5">
              {todayCleared.map((q, i) => (
                <QuestChip key={i} quest={q} />
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={save}
            disabled={busy || (!body.trim() && !mood)}
            className="flex-1 border border-system/60 bg-system/10 py-2 text-xs font-bold tracking-[0.3em] text-system transition hover:bg-system/20 disabled:opacity-40"
          >
            {busy ? "SAVING…" : todayEntry ? "UPDATE ENTRY" : "SEAL ENTRY"}
          </button>
          {saved && <span className="text-[10px] tracking-widest text-system/60">✓ RECORDED</span>}
        </div>
      </SysWindow>

      {/* Past entries timeline */}
      <div className="mt-5">
        <p className="mb-3 text-center text-[10px] tracking-[0.4em] text-system/40">— PAST RECORDS —</p>
        {pastEntries.length === 0 ? (
          <p className="py-6 text-center text-xs text-system/45">
            No past entries yet. Your log begins today.
          </p>
        ) : (
          <div className="space-y-3">
            {pastEntries.map((e, i) => (
              <EntryCard key={e.id} entry={e} cleared={clearedByDate[e.date] ?? []} delay={i * 40} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function QuestChip({ quest }: { quest: ClearedQuest }) {
  const color = CAT_COLOR[quest.category] ?? "#36c5ff";
  return (
    <span
      className="inline-flex items-center gap-1 border px-2 py-0.5 text-[10px] tracking-wide"
      style={{ borderColor: `${color}55`, color, background: `${color}12` }}
    >
      ⚔ {quest.title}
    </span>
  );
}

function EntryCard({ entry, cleared, delay }: { entry: JournalEntry; cleared: ClearedQuest[]; delay: number }) {
  const m = entry.mood ? MOOD_BY_KEY[entry.mood] : null;
  return (
    <SysWindow delay={delay}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-bold tracking-wide text-system">{formatDate(entry.date)}</span>
        {m && (
          <span className="inline-flex items-center gap-1 text-[10px] tracking-widest" style={{ color: m.color }}>
            {m.icon} {m.label}
          </span>
        )}
      </div>
      {entry.body && (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{entry.body}</p>
      )}
      {cleared.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-system/15 pt-2.5">
          {cleared.map((q, i) => (
            <QuestChip key={i} quest={q} />
          ))}
        </div>
      )}
    </SysWindow>
  );
}
