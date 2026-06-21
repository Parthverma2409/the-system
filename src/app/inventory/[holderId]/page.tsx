import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HolderClient, { type RecordRow } from "@/components/HolderClient";

export const dynamic = "force-dynamic";

export default async function HolderPage({ params }: { params: Promise<{ holderId: string }> }) {
  const { holderId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS already scopes to the owner; .single() 404s if it isn't theirs.
  const { data: holder } = await supabase
    .from("holders")
    .select("id,name,icon")
    .eq("id", holderId)
    .single();
  if (!holder) notFound();

  const { data: records } = await supabase
    .from("records")
    .select("id,title,file_path,mime,tags,issued_date,expiry_date,note")
    .eq("holder_id", holderId)
    .order("created_at", { ascending: false });

  // Batch-sign short-lived view URLs (private bucket — never public links).
  const paths = (records ?? []).map((r) => r.file_path);
  const signed = paths.length
    ? (await supabase.storage.from("records").createSignedUrls(paths, 3600)).data ?? []
    : [];
  const urlByPath = new Map(signed.map((s) => [s.path, s.signedUrl] as const));

  const initialRecords: RecordRow[] = (records ?? []).map((r) => ({
    ...r,
    url: urlByPath.get(r.file_path) ?? null,
  }));

  return <HolderClient userId={user.id} holder={holder} initialRecords={initialRecords} />;
}
