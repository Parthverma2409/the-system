import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import JournalClient, { type JournalEntry, type ClearedQuest } from "@/components/JournalClient";

export const dynamic = "force-dynamic";

export default async function JournalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: entries }, { data: logs }] = await Promise.all([
    supabase
      .from("journal")
      .select("id,date,body,mood")
      .eq("user_id", user.id)
      .order("date", { ascending: false }),
    supabase
      .from("quest_logs")
      .select("date,quests(title,category)")
      .eq("user_id", user.id)
      .eq("status", "done")
      .order("date", { ascending: false }),
  ]);

  // Group cleared quests by their date so the log can show what was conquered.
  const clearedByDate: Record<string, ClearedQuest[]> = {};
  for (const l of logs ?? []) {
    // Supabase types the embedded relation as an array; it's a to-one join here.
    const rel = (l as unknown as { quests: { title: string; category: string } | { title: string; category: string }[] | null }).quests;
    const quest = Array.isArray(rel) ? rel[0] : rel;
    if (!quest) continue;
    (clearedByDate[l.date] ??= []).push({ title: quest.title, category: quest.category });
  }

  return (
    <JournalClient
      userId={user.id}
      initialEntries={(entries ?? []) as JournalEntry[]}
      clearedByDate={clearedByDate}
    />
  );
}
