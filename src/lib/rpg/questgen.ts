// The System's Daily Quest generator (pure, deterministic, unit-testable).
// Given a hunter's state and the date, the System issues a scaled set of
// mandatory Daily Quests — exactly like the manhwa, but the targets grow with
// your level (progressive overload, the real STR protocol) so it never trivialises.
import {
  STAT_KEYS,
  CATEGORY_STAT,
  Difficulty,
  StatKey,
} from "@/lib/rpg/engine";
import { PROTOCOLS } from "@/lib/rpg/protocols";

export type Category = "health" | "study" | "routine" | "focus" | "social" | "creative";

export interface SystemQuest {
  key: string; // stable id for the template (for dedupe)
  title: string; // already scaled, e.g. "Push-ups ×46"
  category: Category;
  difficulty: Difficulty;
  protocol: string; // one-line coaching cue
}

// ---- seeded RNG so a given (user, day) always yields the same quest set ----
function hashSeed(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// difficulty escalates with level — the System raises its expectations as you grow.
function scaledDifficulty(base: Difficulty, level: number): Difficulty {
  const order: Difficulty[] = ["Easy", "Normal", "Hard", "Boss"];
  const bump = level >= 60 ? 2 : level >= 25 ? 1 : 0;
  const idx = Math.min(order.length - 1, order.indexOf(base) + bump);
  return order[idx];
}

type Gen = (level: number) => { title: string; base: Difficulty };

// Quest pool, one bank per category. Targets are functions of level → overload.
const POOL: Record<Category, Gen[]> = {
  health: [
    (l) => ({ title: `Push-ups ×${Math.min(100, 20 + l * 3)}`, base: "Normal" }),
    (l) => ({ title: `Squats ×${Math.min(100, 20 + l * 3)}`, base: "Normal" }),
    (l) => ({ title: `Sit-ups ×${Math.min(100, 20 + l * 3)}`, base: "Normal" }),
    (l) => ({ title: `Run ${(2 + l * 0.2).toFixed(1)} km`, base: "Hard" }),
  ],
  study: [
    (l) => ({ title: `Spaced-repetition review · ${20 + l * 2} min`, base: "Normal" }),
    (l) => ({ title: `Deliberate practice on a weak point · ${25 + l * 2} min`, base: "Hard" }),
    (l) => ({ title: `Retrieval practice: self-test ${10 + l} questions`, base: "Normal" }),
  ],
  routine: [
    () => ({ title: `Make your bed + one 1% habit`, base: "Easy" }),
    () => ({ title: `Lights out by your fixed bedtime tonight`, base: "Normal" }),
    () => ({ title: `Plan tomorrow: "I will [X] at [time]"`, base: "Easy" }),
  ],
  focus: [
    (l) => ({ title: `${1 + Math.floor(l / 12)} Pomodoro(s) of deep work`, base: "Normal" }),
    () => ({ title: `One distraction-free block on your hardest task`, base: "Hard" }),
  ],
  social: [
    () => ({ title: `One active-listening conversation (phone away)`, base: "Normal" }),
    () => ({ title: `Reach out to someone — presence + warmth`, base: "Easy" }),
  ],
  creative: [
    (l) => ({ title: `${10 + Math.floor(l / 2)} min mindful breathing / body scan`, base: "Normal" }),
    () => ({ title: `Notice 3 things you'd normally miss — perception drill`, base: "Easy" }),
  ],
};

function statToCategory(stat: StatKey): Category {
  return PROTOCOLS[stat].category as Category;
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

export interface GenInput {
  userId: string;
  date: string; // YYYY-MM-DD
  level: number;
  stats: Record<StatKey, number>;
  count?: number; // default 4
}

// Build today's mandatory Daily Quests:
//  • one rotating core conditioning quest (the iconic SL set),
//  • the rest aimed at the hunter's weakest stats (adaptive balancing),
//  • deduped by category, scaled to level.
export function generateSystemQuests(input: GenInput): SystemQuest[] {
  const { userId, date, level, stats, count = 4 } = input;
  const rng = mulberry32(hashSeed(`${userId}:${date}`));

  const chosen: SystemQuest[] = [];
  const usedCategories = new Set<Category>();

  const addFrom = (category: Category) => {
    if (usedCategories.has(category)) return;
    const gen = pick(POOL[category], rng);
    const { title, base } = gen(level);
    const stat = CATEGORY_STAT[category];
    chosen.push({
      key: `${category}:${title}`,
      title,
      category,
      difficulty: scaledDifficulty(base, level),
      protocol: PROTOCOLS[stat].tagline,
    });
    usedCategories.add(category);
  };

  // 1) A core conditioning quest is always issued (rotates by day).
  addFrom("health");

  // 2) Target the weakest stats next — the System trains what you neglect.
  const weakestFirst = [...STAT_KEYS].sort((a, b) => (stats[a] ?? 0) - (stats[b] ?? 0));
  for (const stat of weakestFirst) {
    if (chosen.length >= count) break;
    addFrom(statToCategory(stat));
  }

  return chosen.slice(0, count);
}
