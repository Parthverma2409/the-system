"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SysWindow } from "@/components/SystemUI";

export interface Garment {
  id: string;
  name: string;
  slot: string;
  color: string | null;
  photo_path: string;
  url: string | null;
}

// Equipment slots (PLAN v2.4), in mannequin order.
export const SLOTS = ["Head", "Top", "Outer", "Bottom", "Footwear", "Accessory"] as const;
const SLOT_ICON: Record<string, string> = {
  Head: "🧢", Top: "👕", Outer: "🧥", Bottom: "👖", Footwear: "👟", Accessory: "⌚",
};
// Core slots that grant the cosmetic "Geared Up" set bonus when all filled.
const CORE: string[] = ["Top", "Bottom", "Footwear"];

function localDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function EquipmentClient({
  userId,
  garments,
  initialEquipped,
}: {
  userId: string;
  garments: Garment[];
  initialEquipped: string[];
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);

  const [equipped, setEquipped] = useState<Set<string>>(new Set(initialEquipped));
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [slot, setSlot] = useState<string>(SLOTS[1]);
  const [color, setColor] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const byId = useMemo(() => new Map(garments.map((g) => [g.id, g])), [garments]);
  const equippedBySlot = useMemo(() => {
    const m = new Map<string, Garment>();
    equipped.forEach((id) => {
      const g = byId.get(id);
      if (g) m.set(g.slot, g);
    });
    return m;
  }, [equipped, byId]);

  const coreComplete = CORE.every((s) => equippedBySlot.has(s));

  async function saveOutfit(ids: string[]) {
    await supabase.from("outfits").upsert(
      { user_id: userId, date: localDate(), item_ids: ids },
      { onConflict: "user_id,date" }
    );
  }

  function toggle(item: Garment) {
    const next = new Set(equipped);
    if (next.has(item.id)) {
      next.delete(item.id);
    } else {
      // one garment per slot — drop any other item occupying this slot
      for (const id of [...next]) {
        if (byId.get(id)?.slot === item.slot) next.delete(id);
      }
      next.add(item.id);
    }
    setEquipped(next);
    void saveOutfit([...next]);
  }

  function pick(f: File | null) {
    setFile(f);
    if (f && !name) setName(f.name.replace(/\.[^.]+$/, ""));
  }

  async function addGarment(e: React.FormEvent) {
    e.preventDefault();
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    try {
      const ext = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("wardrobe").upload(path, file, {
        contentType: file.type || undefined,
        upsert: false,
      });
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from("wardrobe").insert({
        user_id: userId,
        name: name.trim() || file.name,
        slot,
        color: color.trim() || null,
        photo_path: path,
      });
      if (insErr) {
        await supabase.storage.from("wardrobe").remove([path]);
        throw insErr;
      }
      setFile(null);
      setName("");
      setColor("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add garment.");
    } finally {
      setBusy(false);
    }
  }

  async function removeGarment(g: Garment) {
    if (busy) return;
    setBusy(true);
    try {
      const next = new Set(equipped);
      if (next.delete(g.id)) {
        setEquipped(next);
        void saveOutfit([...next]);
      }
      await supabase.storage.from("wardrobe").remove([g.photo_path]);
      await supabase.from("wardrobe").delete().eq("id", g.id);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <header className="mb-5 flex items-center justify-between sys-in">
        <Link href="/" className="text-[11px] tracking-widest text-system/55 hover:text-system">← STATUS</Link>
        <p className="text-[10px] tracking-[0.4em] text-system/45">EQUIPMENT</p>
      </header>

      <SysWindow title="TODAY'S ATTIRE" className="mb-5">
        <div className="grid grid-cols-3 gap-2.5">
          {SLOTS.map((s) => {
            const g = equippedBySlot.get(s);
            return (
              <div
                key={s}
                className="flex aspect-square flex-col items-center justify-center border bg-black/40 text-center"
                style={{ borderColor: g ? "rgba(54,197,255,.6)" : "rgba(54,197,255,.2)", boxShadow: g ? "0 0 12px rgba(54,197,255,.25)" : "none" }}
              >
                {g && g.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={g.url} alt={g.name} className="h-full w-full object-cover" />
                ) : (
                  <>
                    <span className="text-2xl opacity-60">{SLOT_ICON[s]}</span>
                    <span className="mt-1 text-[9px] tracking-widest text-system/45">{s.toUpperCase()}</span>
                  </>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-center text-[11px] tracking-widest" style={{ color: coreComplete ? "var(--gold)" : "var(--system)", opacity: coreComplete ? 1 : 0.5 }}>
          {coreComplete ? "✦ SET BONUS · GEARED UP (cosmetic)" : "Equip Top · Bottom · Footwear for a set bonus"}
        </p>
      </SysWindow>

      <SysWindow title="WARDROBE" className="mb-5" delay={80}>
        {garments.length === 0 ? (
          <p className="py-6 text-center text-xs text-system/50">No garments yet. Scan your first below.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
            {garments.map((g) => {
              const on = equipped.has(g.id);
              return (
                <div key={g.id} className="flex flex-col border bg-system/5" style={{ borderColor: on ? "var(--system)" : "rgba(54,197,255,.2)" }}>
                  <button onClick={() => toggle(g)} className="relative block aspect-square overflow-hidden bg-black/40">
                    {g.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={g.url} alt={g.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-3xl">{SLOT_ICON[g.slot] ?? "👕"}</span>
                    )}
                    {on && <span className="absolute right-1 top-1 bg-system px-1 text-[8px] font-bold text-bg">EQUIPPED</span>}
                  </button>
                  <div className="flex items-center justify-between gap-1 p-1.5">
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-bold text-foreground">{g.name}</p>
                      <p className="text-[8px] tracking-widest text-system/45">{g.slot.toUpperCase()}{g.color ? ` · ${g.color}` : ""}</p>
                    </div>
                    <button onClick={() => removeGarment(g)} disabled={busy} title="Delete garment" className="shrink-0 text-system/40 hover:text-danger disabled:opacity-40">✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SysWindow>

      <SysWindow title="SCAN GARMENT" delay={120}>
        <form onSubmit={addGarment} className="space-y-2.5">
          <div className="flex gap-2">
            <input ref={fileInput} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0] ?? null)} />
            <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={(e) => pick(e.target.files?.[0] ?? null)} />
            <button type="button" onClick={() => fileInput.current?.click()} className="flex-1 border border-system/40 py-2 text-xs font-bold tracking-wider text-system hover:bg-system/10">⬆ UPLOAD</button>
            <button type="button" onClick={() => cameraInput.current?.click()} className="flex-1 border border-system/40 py-2 text-xs font-bold tracking-wider text-system hover:bg-system/10">📷 SCAN</button>
          </div>
          {file && <p className="truncate text-[11px] text-gold">✦ {file.name}</p>}
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Garment name" className="w-full border border-system/30 bg-black/40 px-2 py-1.5 text-sm outline-none focus:border-system/70" />
          <div className="flex gap-2">
            <select value={slot} onChange={(e) => setSlot(e.target.value)} className="flex-1 border border-system/30 bg-black/40 px-2 py-1.5 text-xs text-foreground">
              {SLOTS.map((s) => <option key={s} value={s} className="bg-bg">{SLOT_ICON[s]} {s}</option>)}
            </select>
            <input value={color} onChange={(e) => setColor(e.target.value)} placeholder="Color" className="flex-1 border border-system/30 bg-black/40 px-2 py-1.5 text-xs outline-none focus:border-system/70" />
          </div>
          {error && <p className="text-xs text-danger">⚠ {error}</p>}
          <button type="submit" disabled={!file || busy} className="w-full border border-system/60 bg-system/10 py-2 text-xs font-bold tracking-widest text-system hover:bg-system/20 disabled:opacity-40">
            {busy ? "ADDING..." : "ADD TO WARDROBE"}
          </button>
        </form>
      </SysWindow>
    </main>
  );
}
