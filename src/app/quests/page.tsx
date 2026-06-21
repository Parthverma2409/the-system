import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { STAT_KEYS, type StatKey } from "@/lib/rpg/engine";
import QuestsClient, { type QuestRow, type QuestsInitial } from "@/components/QuestsClient";

export const dynamic = "force-dynamic";

export default async function QuestsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const today = new Date().toISOString().slice(0, 10);
  const [{ data: profile }, { data: statRows }, { data: streak }, { data: quests }, { data: todayLogs }] =
    await Promise.all([
      supabase.from("profiles").select("total_exp,dungeons_cleared").eq("id", user.id).single(),
      supabase.from("stats").select("stat_key,value").eq("user_id", user.id),
      supabase.from("streaks").select("current").eq("user_id", user.id).single(),
      supabase
        .from("quests")
        .select("id,title,notes,category,cadence,difficulty,status,due_date,sort_order,source,system_date")
        .eq("user_id", user.id)
        .order("sort_order"),
      supabase.from("quest_logs").select("exp_awarded").eq("user_id", user.id).eq("date", today).eq("status", "done"),
    ]);

  const stats = Object.fromEntries(STAT_KEYS.map((k) => [k, 0])) as Record<StatKey, number>;
  for (const r of statRows ?? []) stats[r.stat_key as StatKey] = r.value;

  const earnedToday = (todayLogs ?? []).reduce((sum, l) => sum + Math.max(0, l.exp_awarded), 0);
  const allQuests = (quests ?? []) as QuestRow[];
  const systemIssuedToday = allQuests.some((q) => q.system_date === today);

  const initial: QuestsInitial = {
    userId: user.id,
    totalExp: profile?.total_exp ?? 0,
    dungeonsCleared: profile?.dungeons_cleared ?? 0,
    streak: streak?.current ?? 0,
    stats,
    earnedToday,
    quests: allQuests,
    today,
    systemIssuedToday,
  };

  return <QuestsClient initial={initial} />;
}
