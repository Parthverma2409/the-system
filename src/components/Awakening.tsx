"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CATEGORY_STAT } from "@/lib/rpg/engine";
import { playPing, playRankUp, vibrate } from "@/lib/sound";

// First-run "Awakening" — the cinematic that turns a curious visitor into a
// hooked Hunter. Typed System prompts → name → choose focuses → ARISE.
type Category = keyof typeof CATEGORY_STAT;

const FOCUSES: { cat: Category; label: string; icon: string; quest: string }[] = [
  { cat: "health", label: "Strength", icon: "💪", quest: "Push-ups ×20" },
  { cat: "study", label: "Intelligence", icon: "📚", quest: "Study / read · 20 min" },
  { cat: "routine", label: "Vitality", icon: "🌅", quest: "Make your bed + one 1% habit" },
  { cat: "focus", label: "Agility", icon: "🎯", quest: "One Pomodoro of deep work" },
  { cat: "social", label: "Charisma", icon: "🗣", quest: "One real conversation, phone away" },
  { cat: "creative", label: "Perception", icon: "🧘", quest: "10 min mindful breathing" },
];

const INTRO = "You have acquired the qualifications to become a Player. Will you accept?";

export default function Awakening({ userId, onDone }: { userId: string; onDone: () => void }) {
  const supabase = useRef(createClient()).current;
  const [step, setStep] = useState(0); // 0 intro · 1 name · 2 focus · 3 arise
  const [typed, setTyped] = useState("");
  const [name, setName] = useState("");
  const [focuses, setFocuses] = useState<Category[]>(["health", "study"]);
  const [busy, setBusy] = useState(false);

  // typewriter for the intro line
  useEffect(() => {
    if (step !== 0) return;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setTyped(INTRO.slice(0, i));
      if (i >= INTRO.length) clearInterval(id);
    }, 38);
    return () => clearInterval(id);
  }, [step]);

  function toggleFocus(c: Category) {
    setFocuses((f) => (f.includes(c) ? f.filter((x) => x !== c) : [...f, c]));
  }

  async function finish() {
    if (busy) return;
    setBusy(true);
    playRankUp();
    vibrate([0, 80, 60, 160]);
    setStep(3);

    const today = new Date().toISOString().slice(0, 10);
    const starters = FOCUSES.filter((f) => focuses.includes(f.cat)).map((f, i) => ({
      user_id: userId,
      title: f.quest,
      notes: "Your first quest from the System.",
      category: f.cat,
      difficulty: "Easy" as const,
      cadence: "daily" as const,
      source: "system",
      system_date: today,
      sort_order: i,
    }));

    await Promise.all([
      supabase.from("profiles").update({ hunter_name: name.trim() || "Hunter", onboarded: true }).eq("id", userId),
      starters.length ? supabase.from("quests").insert(starters) : Promise.resolve(),
    ]);

    setTimeout(onDone, 2200); // let the ARISE beat land
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center px-6"
      style={{ background: "radial-gradient(circle at 50% 40%, rgba(20,40,70,.5), #02040a 70%)" }}>

      {step === 0 && (
        <div className="w-full max-w-md text-center">
          <p className="text-[10px] tracking-[0.6em] text-system/60">⟢ THE SYSTEM ⟣</p>
          <p className="mt-8 min-h-[3.5rem] text-lg leading-relaxed text-system" style={{ textShadow: "0 0 10px rgba(54,197,255,.6)" }}>
            {typed}
            <span className="animate-pulse">▋</span>
          </p>
          {typed.length >= INTRO.length && (
            <button
              onClick={() => { playPing(); vibrate(30); setStep(1); }}
              className="notify-in mt-10 w-full border border-system bg-system/10 py-3 text-sm font-black tracking-[0.4em] text-system"
              style={{ boxShadow: "0 0 22px rgba(54,197,255,.4)" }}
            >
              ACCEPT
            </button>
          )}
        </div>
      )}

      {step === 1 && (
        <div className="notify-in w-full max-w-md text-center">
          <p className="text-[10px] tracking-[0.5em] text-system/55">REGISTRATION</p>
          <h2 className="glow mt-2 text-xl font-black tracking-wide text-system">NAME YOURSELF, HUNTER</h2>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 18))}
            onKeyDown={(e) => e.key === "Enter" && name.trim() && setStep(2)}
            placeholder="Your hunter name"
            className="mt-6 w-full border border-system/40 bg-black/40 px-3 py-3 text-center text-lg outline-none focus:border-system"
          />
          <button
            onClick={() => name.trim() && setStep(2)}
            disabled={!name.trim()}
            className="mt-5 w-full border border-system bg-system/10 py-3 text-sm font-bold tracking-[0.4em] text-system disabled:opacity-40"
          >
            CONTINUE
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="notify-in w-full max-w-md text-center">
          <p className="text-[10px] tracking-[0.5em] text-system/55">CALIBRATION</p>
          <h2 className="glow mt-2 text-xl font-black tracking-wide text-system">WHAT WILL YOU TRAIN?</h2>
          <p className="mt-1 text-[11px] text-system/45">Choose your path. The System will issue your first quests.</p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            {FOCUSES.map((f) => {
              const on = focuses.includes(f.cat);
              return (
                <button
                  key={f.cat}
                  onClick={() => toggleFocus(f.cat)}
                  className="flex items-center gap-2 border px-3 py-3 text-left transition"
                  style={{
                    borderColor: on ? "var(--system)" : "rgba(54,197,255,.2)",
                    background: on ? "rgba(54,197,255,.1)" : "transparent",
                    boxShadow: on ? "0 0 12px rgba(54,197,255,.25)" : "none",
                  }}
                >
                  <span className="text-xl">{f.icon}</span>
                  <span className="text-xs font-bold tracking-wide" style={{ color: on ? "var(--system)" : "color-mix(in srgb, var(--system) 55%, transparent)" }}>
                    {f.label}
                  </span>
                </button>
              );
            })}
          </div>
          <button
            onClick={finish}
            disabled={focuses.length === 0 || busy}
            className="mt-5 w-full border border-system bg-system/10 py-3 text-sm font-black tracking-[0.4em] text-system disabled:opacity-40"
            style={{ boxShadow: "0 0 22px rgba(54,197,255,.4)" }}
          >
            BEGIN
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="text-center">
          <div className="cine-flash pointer-events-none absolute inset-0" style={{ background: "var(--gold)" }} />
          <h1 className="cine-title text-6xl font-black tracking-[0.2em] text-gold sm:text-8xl"
            style={{ textShadow: "0 0 30px var(--gold), 0 0 70px var(--gold)" }}>
            ARISE
          </h1>
          <p className="cine-sub2 mt-4 text-sm tracking-[0.4em] text-foreground">
            WELCOME, {(name.trim() || "HUNTER").toUpperCase()}
          </p>
        </div>
      )}
    </div>
  );
}
