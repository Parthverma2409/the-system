// daily-rollover — nightly Penalty Zone job (PLAN D2).
// At local midnight (driven by pg_cron), any Daily quest still `todo` is marked
// `failed`, the hunter loses EXP (never de-levelling — floored at the current
// level start), their streak resets, and a penalty push is sent.
// Idempotent: it only ever acts on quests still in `todo`, so a re-run is a no-op.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ---- engine math, mirrored from src/lib/rpg/engine.ts ----
const DAILY_PENALTY = 15;
function xpToNext(level: number): number {
  return Math.round(50 * Math.pow(level, 2.4));
}
function levelOf(totalExp: number): number {
  let level = 1;
  let remaining = Math.max(0, Math.floor(totalExp));
  while (level < 999) {
    const need = xpToNext(level);
    if (remaining < need) break;
    remaining -= need;
    level++;
  }
  return level;
}
function applyPenalty(totalExp: number, missedCount: number): number {
  const level = levelOf(totalExp);
  let floor = 0;
  for (let l = 1; l < level; l++) floor += xpToNext(l);
  return Math.max(floor, totalExp - DAILY_PENALTY * Math.max(0, missedCount));
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

async function pushPenalty(userId: string, missed: number, lost: number) {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
      body: JSON.stringify({
        user_id: userId,
        title: "⚠ PENALTY ZONE",
        body: `${missed} Daily Quest${missed === 1 ? "" : "s"} failed. −${lost} EXP · streak reset.`,
        url: "/",
        tag: "penalty",
      }),
    });
  } catch {
    // push is best-effort; the penalty itself has already been applied
  }
}

Deno.serve(async () => {
  const today = new Date().toISOString().slice(0, 10);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id,total_exp")
    .eq("penalty_enabled", true);

  let usersPenalized = 0;
  let questsFailed = 0;

  for (const p of profiles ?? []) {
    const { data: todo } = await supabase
      .from("quests")
      .select("id")
      .eq("user_id", p.id)
      .eq("cadence", "daily")
      .eq("status", "todo");

    const missed = todo?.length ?? 0;
    if (missed === 0) continue;

    const ids = todo!.map((q) => q.id);
    await supabase.from("quests").update({ status: "failed" }).in("id", ids);

    await supabase.from("quest_logs").insert(
      ids.map((quest_id) => ({
        user_id: p.id,
        quest_id,
        date: today,
        status: "failed",
        exp_awarded: -DAILY_PENALTY,
      }))
    );

    const newExp = applyPenalty(p.total_exp, missed);
    const lost = p.total_exp - newExp;
    await supabase.from("profiles").update({ total_exp: newExp }).eq("id", p.id);
    await supabase.from("streaks").update({ current: 0 }).eq("user_id", p.id);

    await pushPenalty(p.id, missed, lost);
    usersPenalized++;
    questsFailed += missed;
  }

  return new Response(
    JSON.stringify({ ran_for: today, usersPenalized, questsFailed }),
    { headers: { "Content-Type": "application/json" } }
  );
});
