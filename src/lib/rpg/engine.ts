// The System — pure RPG engine.
// No network, no React. Just math. This is the heart of the game and gets unit-tested.

export const STAT_KEYS = ["STR", "INT", "VIT", "CHA", "AGI", "PER"] as const;
export type StatKey = (typeof STAT_KEYS)[number];

export const STAT_LABELS: Record<StatKey, string> = {
  STR: "Strength",
  INT: "Intelligence",
  VIT: "Vitality",
  CHA: "Charisma",
  AGI: "Agility",
  PER: "Perception",
};

// Which category feeds which stat.
export const CATEGORY_STAT: Record<string, StatKey> = {
  health: "STR",
  study: "INT",
  routine: "VIT",
  social: "CHA",
  focus: "AGI",
  creative: "PER",
};

export type Difficulty = "Easy" | "Normal" | "Hard" | "Boss";
export const BASE_EXP: Record<Difficulty, number> = {
  Easy: 8,
  Normal: 18,
  Hard: 35,
  Boss: 60,
};

export type Rank = "E" | "D" | "C" | "B" | "A" | "S";
export const RANKS: Rank[] = ["E", "D", "C", "B", "A", "S"];

// Letter grade for a single stat's value (mirrors the rank-trial thresholds).
export function statRank(value: number): Rank {
  if (value >= 90) return "S";
  if (value >= 70) return "A";
  if (value >= 50) return "B";
  if (value >= 30) return "C";
  if (value >= 10) return "D";
  return "E";
}

// ---- Level curve (HARD on purpose) -------------------------------------------------
// EXP required to advance FROM `level` to level+1.
export function xpToNext(level: number): number {
  return Math.round(50 * Math.pow(level, 2.4));
}

// Given lifetime EXP, derive current level + progress into it.
export function progression(totalExp: number): {
  level: number;
  intoLevel: number; // exp earned into the current level
  toNext: number; // exp required to reach next level
  pct: number; // 0..1 progress to next level
} {
  let level = 1;
  let remaining = Math.max(0, Math.floor(totalExp));
  // Cap iteration so a bad value can't hang the loop.
  while (level < 999) {
    const need = xpToNext(level);
    if (remaining < need) break;
    remaining -= need;
    level++;
  }
  const toNext = xpToNext(level);
  return { level, intoLevel: remaining, toNext, pct: toNext ? remaining / toNext : 0 };
}

// ---- EXP economy -------------------------------------------------------------------
export function streakBonus(streak: number): number {
  // +2% per streak day, capped at 30 days (+60%).
  return 1 + Math.min(Math.max(streak, 0), 30) * 0.02;
}

export function dailyCap(level: number): number {
  return 120 + level * 6;
}

export interface AwardOpts {
  difficulty: Difficulty;
  streak: number;
  isSRank?: boolean; // Sovereign 2x multiplier
  earnedToday?: number; // exp already earned today (for the cap)
  level?: number; // for cap calc (defaults to 1)
}

// Compute EXP awarded for clearing one quest, applying streak bonus, Sovereign
// multiplier, and the diminishing-returns daily cap.
export function awardExp(opts: AwardOpts): number {
  const { difficulty, streak, isSRank = false, earnedToday = 0, level = 1 } = opts;
  let exp = BASE_EXP[difficulty] * streakBonus(streak);
  if (isSRank) exp *= 2;
  exp = Math.round(exp);

  const cap = dailyCap(level);
  if (earnedToday >= cap) return Math.round(exp * 0.1); // hard past-cap: 10%
  if (earnedToday + exp > cap) {
    const under = cap - earnedToday;
    const over = earnedToday + exp - cap;
    return Math.round(under + over * 0.1); // partial past-cap
  }
  return exp;
}

// Penalty for a missed daily quest. Never de-levels: floors at the current level start.
export const DAILY_PENALTY = 15;
export function applyPenalty(totalExp: number, missedCount: number): number {
  const { level } = progression(totalExp);
  // exp at the floor of the current level
  let floor = 0;
  for (let l = 1; l < level; l++) floor += xpToNext(l);
  return Math.max(floor, totalExp - DAILY_PENALTY * Math.max(0, missedCount));
}

// ---- Derived vitals (HP / MP / Fatigue) --------------------------------------------
// These are NOT invented numbers — they're honest readouts derived from real behaviour
// (see PLAN v2.1). HP = consistency/health, MP = mental energy, FATIGUE = burnout risk.
export interface Vital {
  cur: number;
  max: number;
  pct: number; // 0..1
}
export interface Vitals {
  hp: Vital;
  mp: Vital;
  fatigue: Vital;
}

export interface VitalsInput {
  level: number;
  stats: Record<StatKey, number>;
  streak: number;
  completionRate: number; // today's dailies cleared / total (0..1)
  focusClearedToday: number; // # of mental/focus quests cleared today (drains MP)
  heavyClearedToday: number; // # of Hard/Boss quests cleared today (raises fatigue)
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const vital = (cur: number, max: number): Vital => {
  const c = Math.max(0, Math.round(cur));
  const m = Math.max(1, Math.round(max));
  return { cur: Math.min(c, m), max: m, pct: clamp01(c / m) };
};

// HP — health & consistency. Full when you clear your dailies and hold a streak;
// it sinks as you miss them. Capacity grows with VIT and level.
export function deriveVitals(input: VitalsInput): Vitals {
  const { level, stats, streak, completionRate, focusClearedToday, heavyClearedToday } = input;
  const vit = stats.VIT ?? 0;
  const int = stats.INT ?? 0;
  const streakFactor = Math.min(Math.max(streak, 0), 30) / 30;

  const hpMax = 80 + vit * 3 + level * 4;
  const hpCur = hpMax * clamp01(0.45 + 0.35 * clamp01(completionRate) + 0.2 * streakFactor);

  // MP — mental energy available today. Starts full; deep-focus work spends it
  // (deep work is finite — ~90 min bursts beat marathons). Capacity grows with INT.
  const mpMax = 80 + int * 3 + level * 4;
  const mpCur = mpMax * clamp01(1 - 0.12 * Math.max(0, focusClearedToday));

  // FATIGUE — burnout risk. Rises with heavy (Hard/Boss) and focus load in a day.
  const fatigueMax = 100;
  const fatigueCur = Math.min(fatigueMax, heavyClearedToday * 22 + focusClearedToday * 6);

  return { hp: vital(hpCur, hpMax), mp: vital(mpCur, mpMax), fatigue: vital(fatigueCur, fatigueMax) };
}

// ---- Ability Points -----------------------------------------------------------------
// Earned on level-up (manually spent to nudge a stat — agency beyond auto-gain).
export const AP_PER_LEVEL = 3;

// Total AP a hunter has earned by reaching `level` (level 1 grants none).
export function abilityPointsEarned(level: number): number {
  return Math.max(0, level - 1) * AP_PER_LEVEL;
}

// ---- Rank trials (rank LAGS behind power, like Jinwoo) -----------------------------
export interface TrialReq {
  rank: Rank;
  minLevel: number;
  minStreak: number;
  statRule: (stats: Record<StatKey, number>) => boolean;
  minDungeons: number;
  describe: string;
}

const allStatsAtLeast = (n: number) => (s: Record<StatKey, number>) =>
  STAT_KEYS.every((k) => (s[k] ?? 0) >= n);
const countStatsAtLeast = (n: number, c: number) => (s: Record<StatKey, number>) =>
  STAT_KEYS.filter((k) => (s[k] ?? 0) >= n).length >= c;

export const TRIALS: TrialReq[] = [
  { rank: "D", minLevel: 12, minStreak: 7, statRule: allStatsAtLeast(10), minDungeons: 0, describe: "7-day streak · all stats ≥ 10" },
  { rank: "C", minLevel: 25, minStreak: 14, statRule: countStatsAtLeast(30, 2), minDungeons: 0, describe: "14-day streak · 2 stats ≥ 30" },
  { rank: "B", minLevel: 40, minStreak: 30, statRule: countStatsAtLeast(50, 4), minDungeons: 1, describe: "30-day streak · 4 stats ≥ 50 · 1 dungeon" },
  { rank: "A", minLevel: 60, minStreak: 45, statRule: allStatsAtLeast(70), minDungeons: 3, describe: "45-day streak · all stats ≥ 70 · 3 dungeons" },
  { rank: "S", minLevel: 85, minStreak: 60, statRule: allStatsAtLeast(90), minDungeons: 5, describe: "60-day streak · all stats ≥ 90 · 5 dungeons" },
];

export interface HunterState {
  rank: Rank;
  level: number;
  streak: number;
  stats: Record<StatKey, number>;
  dungeonsCleared: number;
}

// The trial for the NEXT rank above current, if any.
export function nextTrial(rank: Rank): TrialReq | null {
  const idx = RANKS.indexOf(rank);
  if (idx < 0 || idx >= RANKS.length - 1) return null;
  const targetRank = RANKS[idx + 1];
  return TRIALS.find((t) => t.rank === targetRank) ?? null;
}

// Is the hunter eligible to attempt promotion right now?
export function trialAvailable(h: HunterState): boolean {
  const t = nextTrial(h.rank);
  if (!t) return false;
  return (
    h.level >= t.minLevel &&
    h.streak >= t.minStreak &&
    h.dungeonsCleared >= t.minDungeons &&
    t.statRule(h.stats)
  );
}
