import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import InventoryClient, { type HolderRow } from "@/components/InventoryClient";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: holders }, { data: records }] = await Promise.all([
    supabase.from("holders").select("id,name,kind,icon").eq("user_id", user.id).order("created_at"),
    supabase.from("records").select("holder_id").eq("user_id", user.id),
  ]);

  const counts = new Map<string, number>();
  (records ?? []).forEach((r) => counts.set(r.holder_id, (counts.get(r.holder_id) ?? 0) + 1));

  const initialHolders: HolderRow[] = (holders ?? []).map((h) => ({
    id: h.id,
    name: h.name,
    kind: h.kind,
    icon: h.icon,
    count: counts.get(h.id) ?? 0,
  }));

  return <InventoryClient userId={user.id} initialHolders={initialHolders} />;
}
