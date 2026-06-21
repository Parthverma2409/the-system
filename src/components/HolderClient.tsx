"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SysWindow } from "@/components/SystemUI";

export interface RecordRow {
  id: string;
  title: string;
  file_path: string;
  mime: string | null;
  tags: string[];
  issued_date: string | null;
  expiry_date: string | null;
  note: string | null;
  url: string | null; // short-lived signed URL (null if signing failed)
}

const isImage = (mime: string | null) => !!mime && mime.startsWith("image/");

// Days until expiry, or null. Negative = already expired.
function daysToExpiry(date: string | null): number | null {
  if (!date) return null;
  const ms = new Date(date + "T00:00:00").getTime() - Date.now();
  return Math.ceil(ms / 86_400_000);
}

export default function HolderClient({
  userId,
  holder,
  initialRecords,
}: {
  userId: string;
  holder: { id: string; name: string; icon: string };
  initialRecords: RecordRow[];
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [issued, setIssued] = useState("");
  const [expiry, setExpiry] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pick(f: File | null) {
    setFile(f);
    if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, ""));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    try {
      const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
      // Leading folder MUST be the user id — storage RLS matches on it.
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("records").upload(path, file, {
        contentType: file.type || undefined,
        upsert: false,
      });
      if (upErr) throw upErr;

      const { error: insErr } = await supabase.from("records").insert({
        user_id: userId,
        holder_id: holder.id,
        title: title.trim() || file.name,
        file_path: path,
        mime: file.type || null,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        issued_date: issued || null,
        expiry_date: expiry || null,
        note: note.trim() || null,
      });
      if (insErr) {
        // roll back the orphaned upload so storage and DB stay in sync
        await supabase.storage.from("records").remove([path]);
        throw insErr;
      }

      setFile(null);
      setTitle("");
      setTags("");
      setIssued("");
      setExpiry("");
      setNote("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(rec: RecordRow) {
    if (busy) return;
    setBusy(true);
    try {
      await supabase.storage.from("records").remove([rec.file_path]);
      await supabase.from("records").delete().eq("id", rec.id);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <header className="mb-5 flex items-center justify-between sys-in">
        <Link href="/inventory" className="text-[11px] tracking-widest text-system/55 hover:text-system">
          ← INVENTORY
        </Link>
        <p className="text-[10px] tracking-[0.4em] text-system/45">HOLDER</p>
      </header>

      <SysWindow title={`${holder.icon}  ${holder.name.toUpperCase()}`} className="mb-5">
        {initialRecords.length === 0 ? (
          <p className="py-6 text-center text-xs text-system/50">No records yet. Add or scan one below.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {initialRecords.map((r) => {
              const d = daysToExpiry(r.expiry_date);
              const expClass = d === null ? "" : d < 0 ? "text-danger" : d <= 30 ? "text-gold" : "text-system/45";
              return (
                <div key={r.id} className="flex flex-col border border-system/25 bg-system/5">
                  <a href={r.url ?? "#"} target="_blank" rel="noopener noreferrer" className="relative block aspect-[4/3] overflow-hidden bg-black/40">
                    {isImage(r.mime) && r.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.url} alt={r.title} className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-4xl">📄</span>
                    )}
                  </a>
                  <div className="flex items-start justify-between gap-1 p-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-foreground">{r.title}</p>
                      {d !== null && (
                        <p className={`text-[9px] tracking-wider ${expClass}`}>
                          {d < 0 ? `EXPIRED ${-d}d AGO` : `EXPIRES IN ${d}d`}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => remove(r)}
                      disabled={busy}
                      title="Delete record"
                      className="shrink-0 text-system/40 hover:text-danger disabled:opacity-40"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SysWindow>

      <SysWindow title="ADD RECORD" delay={80}>
        <form onSubmit={save} className="space-y-2.5">
          <div className="flex gap-2">
            <input ref={fileInput} type="file" accept="image/*,application/pdf" hidden onChange={(e) => pick(e.target.files?.[0] ?? null)} />
            <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={(e) => pick(e.target.files?.[0] ?? null)} />
            <button type="button" onClick={() => fileInput.current?.click()} className="flex-1 border border-system/40 py-2 text-xs font-bold tracking-wider text-system hover:bg-system/10">
              ⬆ UPLOAD
            </button>
            <button type="button" onClick={() => cameraInput.current?.click()} className="flex-1 border border-system/40 py-2 text-xs font-bold tracking-wider text-system hover:bg-system/10">
              📷 SCAN
            </button>
          </div>
          {file && <p className="truncate text-[11px] text-gold">✦ {file.name}</p>}

          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="w-full border border-system/30 bg-black/40 px-2 py-1.5 text-sm outline-none focus:border-system/70" />
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Tags (comma separated)" className="w-full border border-system/30 bg-black/40 px-2 py-1.5 text-xs outline-none focus:border-system/70" />
          <div className="flex gap-2">
            <label className="flex-1 text-[10px] tracking-widest text-system/55">
              ISSUED
              <input type="date" value={issued} onChange={(e) => setIssued(e.target.value)} className="mt-1 w-full border border-system/30 bg-black/40 px-2 py-1.5 text-xs text-foreground outline-none focus:border-system/70" />
            </label>
            <label className="flex-1 text-[10px] tracking-widest text-system/55">
              EXPIRES
              <input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} className="mt-1 w-full border border-system/30 bg-black/40 px-2 py-1.5 text-xs text-foreground outline-none focus:border-system/70" />
            </label>
          </div>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className="w-full border border-system/30 bg-black/40 px-2 py-1.5 text-xs outline-none focus:border-system/70" />

          {error && <p className="text-xs text-danger">⚠ {error}</p>}
          <button type="submit" disabled={!file || busy} className="w-full border border-system/60 bg-system/10 py-2 text-xs font-bold tracking-widest text-system hover:bg-system/20 disabled:opacity-40">
            {busy ? "STORING..." : "STORE RECORD"}
          </button>
        </form>
      </SysWindow>
    </main>
  );
}
