import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LeaderboardClient, { type LeaderRow } from "@/components/LeaderboardClient";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase.rpc("leaderboard");
  const rows = (data ?? []) as LeaderRow[];

  return <LeaderboardClient initialRows={rows} />;
}
