"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Claim a public handle and toggle a shareable, read-only Hunter profile at
// /h/<handle> — a link-in-bio that turns every user into a billboard.
const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 20);

export default function PublicProfileControl({
  userId,
  initialHandle,
  initialPublic,
}: {
  userId: string;
  initialHandle: string | null;
  initialPublic: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [handle, setHandle] = useState(initialHandle ?? "");
  const [isPublic, setIsPublic] = useState(initialPublic);
  const [savedHandle, setSavedHandle] = useState(initialHandle ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const link = savedHandle && typeof window !== "undefined" ? `${window.location.origin}/h/${savedHandle}` : "";

  async function save() {
    const h = clean(handle);
    if (busy) return;
    if (h.length < 3) {
      setMsg("Handle must be at least 3 characters (a–z, 0–9, - _).");
      return;
    }
    setBusy(true);
    setMsg(null);
    const { error } = await supabase
      .from("profiles")
      .update({ handle: h, public_profile: isPublic })
      .eq("id", userId);
    if (error) {
      setMsg(error.code === "23505" ? "That handle is already taken." : "Couldn't save — try again.");
    } else {
      setSavedHandle(h);
      setHandle(h);
      setMsg(isPublic ? "Profile is live ✦" : "Saved. Toggle public to share.");
    }
    setBusy(false);
  }

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setMsg("Copy failed — long-press the link to copy.");
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-[11px] tracking-widest text-system/45">/h/</span>
        <input
          value={handle}
          onChange={(e) => setHandle(clean(e.target.value))}
          placeholder="your-handle"
          className="flex-1 border border-system/30 bg-black/40 px-2 py-1.5 text-sm outline-none focus:border-system/70"
        />
        <button
          onClick={() => setIsPublic((p) => !p)}
          className="shrink-0 border px-2.5 py-1.5 text-[10px] font-bold tracking-widest transition"
          style={{
            borderColor: isPublic ? "var(--system)" : "rgba(54,197,255,.25)",
            color: isPublic ? "var(--system)" : "color-mix(in srgb, var(--system) 50%, transparent)",
            background: isPublic ? "rgba(54,197,255,.1)" : "transparent",
          }}
        >
          {isPublic ? "PUBLIC ✓" : "PRIVATE"}
        </button>
      </div>

      <button
        onClick={save}
        disabled={busy}
        className="w-full border border-system/55 bg-system/10 py-1.5 text-[11px] font-bold tracking-[0.3em] text-system transition hover:bg-system/20 disabled:opacity-50"
      >
        {busy ? "SAVING…" : "SAVE PUBLIC PROFILE"}
      </button>

      {msg && <p className="text-[10px] tracking-wider text-system/60">{msg}</p>}

      {isPublic && savedHandle && (
        <div className="flex items-center gap-2 border border-system/20 bg-system/5 px-2 py-1.5">
          <span className="min-w-0 flex-1 truncate text-[11px] text-system/70">{link}</span>
          <button onClick={copy} className="shrink-0 text-[10px] font-bold tracking-widest text-system hover:text-system-bright">
            {copied ? "COPIED" : "COPY"}
          </button>
        </div>
      )}
    </div>
  );
}
