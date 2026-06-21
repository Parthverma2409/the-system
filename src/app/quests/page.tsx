import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ComingSoon from "@/components/ComingSoon";

export const dynamic = "force-dynamic";

export default async function QuestsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return (
    <ComingSoon
      title="QUEST BOARD"
      phase="UNLOCKS IN PHASE 6"
      blurb="Daily / Weekly / Monthly quests and Dungeons (projects) — full CRUD and states. For now, manage your daily quests from the Status screen."
    />
  );
}
