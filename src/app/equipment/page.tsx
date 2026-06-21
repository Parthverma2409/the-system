import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EquipmentClient, { type Garment } from "@/components/EquipmentClient";

export const dynamic = "force-dynamic";

function localDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function EquipmentPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: items }, { data: outfit }] = await Promise.all([
    supabase
      .from("wardrobe")
      .select("id,name,slot,color,photo_path")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("outfits")
      .select("item_ids")
      .eq("user_id", user.id)
      .eq("date", localDate())
      .maybeSingle(),
  ]);

  // Batch-sign short-lived photo URLs (private bucket).
  const paths = (items ?? []).map((g) => g.photo_path);
  const signed = paths.length
    ? (await supabase.storage.from("wardrobe").createSignedUrls(paths, 3600)).data ?? []
    : [];
  const urlByPath = new Map(signed.map((s) => [s.path, s.signedUrl] as const));

  const garments: Garment[] = (items ?? []).map((g) => ({
    ...g,
    url: urlByPath.get(g.photo_path) ?? null,
  }));

  return (
    <EquipmentClient
      userId={user.id}
      garments={garments}
      initialEquipped={(outfit?.item_ids as string[] | undefined) ?? []}
    />
  );
}
