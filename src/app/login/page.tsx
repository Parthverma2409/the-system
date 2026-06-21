"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [hunterName, setHunterName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === "up") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { hunter_name: hunterName || email.split("@")[0] } },
        });
        if (error) throw error;
        // If email confirmation is off, a session exists immediately.
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          router.push("/");
          router.refresh();
        } else {
          setInfo("Check your email to confirm, then sign in, Hunter.");
          setMode("in");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/");
        router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm sys-window sys-nodes sys-in">
        <div className="sys-header">[ THE SYSTEM ]</div>
        <div className="p-6">
          <h1 className="glow mb-1 text-center text-4xl font-black tracking-[0.2em] text-system">
            ARISE
          </h1>
          <p className="mb-6 text-center text-[10px] tracking-[0.3em] text-system/50">
            {mode === "in" ? "AUTHENTICATE TO ENTER" : "REGISTER A NEW HUNTER"}
          </p>

          <form onSubmit={submit} className="space-y-3">
            {mode === "up" && (
              <Field
                label="HUNTER NAME"
                value={hunterName}
                onChange={setHunterName}
                placeholder="Sung Jinwoo"
                type="text"
                required={false}
              />
            )}
            <Field label="EMAIL" value={email} onChange={setEmail} placeholder="you@email.com" type="email" required />
            <Field label="PASSWORD" value={password} onChange={setPassword} placeholder="••••••••" type="password" required />

            {error && <p className="text-xs text-danger">⚠ {error}</p>}
            {info && <p className="text-xs text-gold">✦ {info}</p>}

            <button
              type="submit"
              disabled={busy}
              className="w-full border border-system/60 bg-system/10 py-2.5 text-sm font-bold tracking-widest text-system transition hover:bg-system/20 disabled:opacity-50"
              style={{ boxShadow: "0 0 14px rgba(54,197,255,.25)" }}
            >
              {busy ? "..." : mode === "in" ? "ENTER" : "AWAKEN"}
            </button>
          </form>

          <button
            onClick={() => {
              setMode((m) => (m === "in" ? "up" : "in"));
              setError(null);
              setInfo(null);
            }}
            className="mt-4 w-full text-center text-[11px] text-system/55 hover:text-system"
          >
            {mode === "in" ? "No account? Awaken as a new Hunter →" : "← Already a Hunter? Sign in"}
          </button>
        </div>
      </div>
    </main>
  );
}

function Field({
  label, value, onChange, placeholder, type, required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type: string;
  required: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] tracking-widest text-system/55">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-system/30 bg-black/40 px-3 py-2 text-sm text-foreground outline-none transition focus:border-system/70"
      />
    </label>
  );
}
