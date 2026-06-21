import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardClient, { type InitialData } from "@/components/DashboardClient";
import { STAT_KEYS, StatKey } from "@/lib/rpg/engine";

export const dynamic = "force-dynamic";

export default async function Page() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: statsRows }, { data: quests }, { data: streak }, { data: apRow }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("stats").select("stat_key,value").eq("user_id", user.id),
      supabase
        .from("quests")
        .select("*")
        .eq("user_id", user.id)
        .eq("cadence", "daily")
        .order("sort_order"),
      supabase.from("streaks").select("*").eq("user_id", user.id).single(),
      supabase.from("ability_points").select("spent").eq("user_id", user.id).maybeSingle(),
    ]);

  const stats = Object.fromEntries(STAT_KEYS.map((k) => [k, 0])) as Record<StatKey, number>;
  (statsRows ?? []).forEach((r) => {
    if (r.stat_key in stats) stats[r.stat_key as StatKey] = r.value;
  });

  const initial: InitialData = {
    userId: user.id,
    hunterName: profile?.hunter_name ?? "Hunter",
    totalExp: profile?.total_exp ?? 0,
    rank: (profile?.rank ?? "E") as InitialData["rank"],
    dungeonsCleared: profile?.dungeons_cleared ?? 0,
    stats,
    streak: streak?.current ?? 0,
    apSpent: apRow?.spent ?? 0,
    quests: (quests ?? []).map((q) => ({
      id: q.id,
      title: q.title,
      category: q.category,
      difficulty: q.difficulty,
      status: q.status,
    })),
  };

  return <DashboardClient initial={initial} />;
}
