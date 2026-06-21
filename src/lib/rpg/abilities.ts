// Skill catalog — consumable abilities bought with Ability Points (AP) and
// "used" to apply a System effect. Kept tiny and cosmetic-adjacent so it can't
// break the hard-leveling economy (double EXP is a one-quest nudge, not a binge).

export type EffectKey = "double_next" | "penalty_shield";

export interface Ability {
  key: string;
  name: string;
  icon: string;
  cost: number; // AP to acquire one charge
  effect: EffectKey;
  blurb: string;
  flavor: string;
}

export const ABILITIES: Ability[] = [
  {
    key: "focus_surge",
    name: "Focus Surge",
    icon: "⚡",
    cost: 4,
    effect: "double_next",
    blurb: "Your next cleared quest grants 2× EXP.",
    flavor: "Channel the System's power into a single decisive strike.",
  },
  {
    key: "iron_will",
    name: "Iron Will",
    icon: "🛡",
    cost: 6,
    effect: "penalty_shield",
    blurb: "Negates the next Penalty Zone — one missed day costs nothing.",
    flavor: "Even Monarchs stumble. Endure, and the System forgives once.",
  },
];

export const ABILITY_BY_EFFECT: Record<EffectKey, Ability> = Object.fromEntries(
  ABILITIES.map((a) => [a.effect, a])
) as Record<EffectKey, Ability>;
