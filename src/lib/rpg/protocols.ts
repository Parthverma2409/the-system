// Evidence-based "how to raise this stat" content (PLAN v2.2). Reference data, not
// game math — kept out of engine.ts so the engine stays pure. Sources are cited in
// PLAN.md §"Research sources".
import type { StatKey } from "./engine";

export interface Protocol {
  domain: string; // real-life domain this stat maps to
  category: string; // quest category that feeds it (CATEGORY_STAT inverse)
  tagline: string; // one-line essence of the method
  steps: string[]; // concrete, evidence-based actions
}

export const PROTOCOLS: Record<StatKey, Protocol> = {
  STR: {
    domain: "Physical training",
    category: "health",
    tagline: "Progressive overload — add ≤10% per week.",
    steps: [
      "Add no more than ~10%/week of weight, reps, sets, or range of motion.",
      "Run a simple linear progression while you're a beginner — it works.",
      "Recovery is a requirement, not a bonus: sleep + adequate protein drive the gains.",
      "Log every session so 'progressive' is measured, not guessed.",
    ],
  },
  INT: {
    domain: "Learning",
    category: "study",
    tagline: "Spaced repetition can ~2× long-term retention vs cramming.",
    steps: [
      "Distribute practice across days — spacing beats massed cramming for retention.",
      "Use retrieval practice: test yourself instead of re-reading.",
      "Deliberate practice: target your weak spots and seek immediate feedback.",
      "Interleave related topics rather than blocking one at a time.",
    ],
  },
  VIT: {
    domain: "Discipline & health habits",
    category: "routine",
    tagline: "Atomic, identity-based habits — 1% better, every day.",
    steps: [
      "Shrink the habit until it's too small to fail, then repeat daily.",
      "Use implementation intentions: 'I will [X] at [time] in [place]' (2–3× success).",
      "Anchor identity: 'I'm the kind of person who…' — consistency over intensity.",
      "Protect sleep regularity; it underwrites every other habit.",
    ],
  },
  CHA: {
    domain: "Social skill",
    category: "social",
    tagline: "Charisma is learnable: Presence, Power, Warmth.",
    steps: [
      "Train presence — be fully here in the conversation, phone away.",
      "Practice active listening; people who feel understood connect more.",
      "Build emotional attunement — read the room, mirror energy.",
      "Balance warmth (care) with power (confidence); both, not one.",
    ],
  },
  AGI: {
    domain: "Focus & execution speed",
    category: "focus",
    tagline: "Pomodoro + deep work — structured bursts beat marathons.",
    steps: [
      "Work in 25/5 Pomodoro cycles; take a longer break every 4th.",
      "Single-task: kill notifications and close extra tabs before you start.",
      "Cap intense focus near ~90 minutes — the brain can't sustain more.",
      "Protect a daily deep-work block on your hardest task first.",
    ],
  },
  PER: {
    domain: "Awareness",
    category: "creative",
    tagline: "Mindfulness sharpens interoception, attention, and calm.",
    steps: [
      "Practice daily mindful breathing or a body scan (start at 5–10 min).",
      "Notice bodily signals — interoception improves with consistent practice.",
      "Use brief attention resets between tasks to clear mental clutter.",
      "Decide calmly: pause, observe, then act rather than react.",
    ],
  },
};
