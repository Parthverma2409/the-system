"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { SysWindow } from "@/components/SystemUI";

export interface HolderRow {
  id: string;
  name: string;
  kind: string;
  icon: string;
  count: number;
}

// Preset holder types (PLAN v2.3). Users can still rename freely.
const KINDS: { kind: string; icon: string; label: string }[] = [
  { kind: "contracts", icon: "📜", label: "Contracts" },
  { kind: "ids", icon: "🪪", label: "IDs & Documents" },
  { kind: "certificates", icon: "🎓", label: "Certificates" },
  { kind: "receipts", icon: "🧾", label: "Receipts" },
  { kind: "warranties", icon: "🛡", label: "Warranties" },
  { kind: "medical", icon: "⚕", label: "Medical" },
  { kind: "notes", icon: "🗒", label: "Notes" },
  { kind: "documents", icon: "🗂", label: "Other" },
];

export default function InventoryClient({
  userId,
  initialHolders,
}: {
  userId: string;
  initialHolders: HolderRow[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [holders, setHolders] = useState<HolderRow[]>(initialHolders);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState(KINDS[0].kind);
  const [busy, setBusy] = useState(false);

  async function createHolder(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    const icon = KINDS.find((k) => k.kind === kind)?.icon ?? "🗂";
    const { data } = await supabase
      .from("holders")
      .insert({ user_id: userId, name: trimmed, kind, icon })
      .select()
      .single();
    if (data) {
      setHolders((h) => [...h, { id: data.id, name: data.name, kind: data.kind, icon: data.icon, count: 0 }]);
    }
    setName("");
    setAdding(false);
    setBusy(false);
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <header className="mb-5 text-center sys-in">
        <p className="text-[10px] tracking-[0.5em] text-system/55">⟢ THE SYSTEM ⟣</p>
        <h1 className="glow mt-1 text-2xl font-black tracking-wide text-system">INVENTORY</h1>
        <p className="mt-1 text-[10px] tracking-[0.3em] text-system/40">DIGITAL RECORDS · PRIVATE VAULT</p>
      </header>

      <SysWindow title="HOLDERS">
        {holders.length === 0 && (
          <p className="py-6 text-center text-xs text-system/50">No holders yet. Create a pouch to store records.</p>
        )}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {holders.map((h) => (
            <Link
              key={h.id}
              href={`/inventory/${h.id}`}
              className="group flex flex-col items-center gap-1 border border-system/25 bg-system/5 px-3 py-4 text-center transition hover:border-system/60 hover:bg-system/10"
              style={{ clipPath: "polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px)" }}
            >
              <span className="text-3xl leading-none">{h.icon}</span>
              <span className="mt-1 text-xs font-bold tracking-wide text-foreground">{h.name}</span>
              <span className="text-[9px] tracking-widest text-system/45">{h.count} {h.count === 1 ? "ITEM" : "ITEMS"}</span>
            </Link>
          ))}
        </div>

        {adding ? (
          <form onSubmit={createHolder} className="mt-3 space-y-2 border border-system/20 p-3">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Holder name (e.g. Passport & IDs)"
              className="w-full border border-system/30 bg-black/40 px-2 py-1.5 text-sm outline-none focus:border-system/70"
            />
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              className="w-full border border-system/30 bg-black/40 px-2 py-1.5 text-xs text-foreground"
            >
              {KINDS.map((k) => (
                <option key={k.kind} value={k.kind} className="bg-bg">{k.icon} {k.label}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button type="submit" disabled={busy} className="flex-1 border border-system/60 bg-system/10 py-1.5 text-xs font-bold tracking-wider text-system hover:bg-system/20 disabled:opacity-50">CREATE</button>
              <button type="button" onClick={() => setAdding(false)} className="border border-system/20 px-3 py-1.5 text-xs text-system/60">CANCEL</button>
            </div>
          </form>
        ) : (
          <button onClick={() => setAdding(true)} className="mt-3 w-full border border-dashed border-system/30 py-2 text-xs tracking-widest text-system/60 hover:border-system/60 hover:text-system">
            + NEW HOLDER
          </button>
        )}
      </SysWindow>

      <p className="mt-4 text-center text-[10px] leading-relaxed text-system/35">
        🔒 Files are stored privately in your own Supabase — never public. Viewed via short-lived signed links.
      </p>
    </main>
  );
}
