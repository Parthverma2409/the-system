// Shadow Army (Solo Leveling "ARISE"). Clearing a Dungeon raises a shadow
// soldier into your army — a collectible with a small Power rating. Cosmetic by
// design: army Power is flavour and never feeds the EXP/level economy.
import type { Difficulty } from "@/lib/rpg/engine";

export interface ShadowTier {
  type: string;
  icon: string;
  base: number; // base power
  weight: number; // relative draw chance at low difficulty
}

// Ascending tiers. Tougher dungeons bias the draw toward the rarer ranks.
const TIERS: ShadowTier[] = [
  { type: "Soldier", icon: "⚔", base: 10, weight: 50 },
  { type: "Knight", icon: "🛡", base: 22, weight: 28 },
  { type: "Mage", icon: "✦", base: 34, weight: 14 },
  { type: "Beast", icon: "🐺", base: 50, weight: 6 },
  { type: "Grand Marshal", icon: "👑", base: 80, weight: 2 },
];

// A pool of names with a Solo Leveling flavour (purely cosmetic).
const NAMES = [
  "Igris", "Iron", "Tank", "Beru", "Tusk", "Kaisel", "Greed", "Bellion",
  "Jima", "Fang", "Ash", "Vargas", "Kargalgan", "Metus", "Tarnak", "Nox",
  "Umbra", "Cael", "Drest", "Morwin",
];

export interface Shadow {
  name: string;
  type: string;
  power: number;
}

export function tierIcon(type: string): string {
  return TIERS.find((t) => t.type === type)?.icon ?? "⚫";
}

// Raise a new shadow. Higher difficulty shifts the weights up the tier list and
// adds power; level adds a steady scaling so late-game shadows are mightier.
export function ariseShadow(level: number, difficulty: Difficulty): Shadow {
  const diffShift = { Easy: 0, Normal: 1, Hard: 2, Boss: 3 }[difficulty];
  const weighted = TIERS.map((t, i) => ({
    t,
    w: Math.max(1, t.weight + diffShift * i * 6),
  }));
  const total = weighted.reduce((s, x) => s + x.w, 0);
  let roll = Math.random() * total;
  let tier = weighted[0].t;
  for (const x of weighted) {
    roll -= x.w;
    if (roll <= 0) {
      tier = x.t;
      break;
    }
  }
  const name = NAMES[Math.floor(Math.random() * NAMES.length)];
  const power = Math.round(tier.base + level * 2 + Math.random() * 10);
  return { name, type: tier.type, power };
}
