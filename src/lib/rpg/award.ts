import { createClient } from "@/lib/supabase/client";
import {
  awardExp,
  progression,
  CATEGORY_STAT,
  AP_PER_LEVEL,
  STAT_LABELS,
  Difficulty,
  StatKey,
} from "@/lib/rpg/engine";
import type { RewardItem } from "@/components/SystemUI";

// Shared quest-completion effect — the single place that turns "cleared a quest"
// into EXP, a stat point, level-ups, AP, and (for dungeons) a cleared count.
// Mirrors the dashboard's original flow so the math lives in exactly one path.
export interface AwardContext {
  userId: string;
  totalExp: number;
  earnedToday: number;
  streak: number;
  stats: Record<StatKey, number>;
  dungeonsCleared: number;
}

export interface AwardQuest {
  id: string;
  category: string;
  difficulty: Difficulty;
  cadence: "daily" | "weekly" | "monthly" | "dungeon";
}

export interface AwardResult {
  gained: number;
  newTotal: number;
  stat: StatKey;
  newStatVal: number;
  leveled: boolean;
  before: number;
  after: number;
  newDungeons: number;
  items: RewardItem[];
  title: string;
}

export async function completeQuest(ctx: AwardContext, quest: AwardQuest): Promise<AwardResult> {
  const before = progression(ctx.totalExp).level;
  const gained = awardExp({
    difficulty: quest.difficulty,
    streak: ctx.streak,
    earnedToday: ctx.earnedToday,
    level: before,
  });
  const stat = CATEGORY_STAT[quest.category] ?? "VIT";
  const newTotal = ctx.totalExp + gained;
  const after = progression(newTotal).level;
  const leveled = after > before;
  const newStatVal = (ctx.stats[stat] ?? 0) + 1;
  const isDungeon = quest.cadence === "dungeon";
  const newDungeons = ctx.dungeonsCleared + (isDungeon ? 1 : 0);

  const supabase = createClient();
  const profileUpdate: Record<string, unknown> = { total_exp: newTotal };
  if (isDungeon) profileUpdate.dungeons_cleared = newDungeons;

  await Promise.all([
    supabase.from("quests").update({ status: "done" }).eq("id", quest.id),
    supabase.from("quest_logs").insert({
      user_id: ctx.userId,
      quest_id: quest.id,
      status: "done",
      exp_awarded: gained,
    }),
    supabase.from("profiles").update(profileUpdate).eq("id", ctx.userId),
    supabase.from("stats").update({ value: newStatVal }).eq("user_id", ctx.userId).eq("stat_key", stat),
    supabase.from("stat_history").insert({ user_id: ctx.userId, stat_key: stat, value: newStatVal }),
  ]);

  const items: RewardItem[] = [
    { label: "EXP GAINED", value: `+${gained}` },
    { label: STAT_LABELS[stat], value: `+1 ${stat}`, color: "var(--system-bright)" },
  ];
  if (isDungeon) items.push({ label: "DUNGEONS CLEARED", value: `${newDungeons}`, color: "var(--gold)" });
  if (leveled) {
    items.push({ label: "LEVEL", value: `${before} → ${after}`, color: "var(--gold)" });
    items.push({ label: "ABILITY POINTS", value: `+${AP_PER_LEVEL * (after - before)}`, color: "var(--gold)" });
  }
  const title = leveled ? "LEVEL UP" : isDungeon ? "DUNGEON CLEARED" : "QUEST REWARDS";

  return { gained, newTotal, stat, newStatVal, leveled, before, after, newDungeons, items, title };
}
