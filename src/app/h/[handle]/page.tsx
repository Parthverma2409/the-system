import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { progression, STAT_KEYS, type StatKey, type Rank } from "@/lib/rpg/engine";
import { RankBadge, StatRadar, ExpBar, SysWindow } from "@/components/SystemUI";

export const dynamic = "force-dynamic";

interface PublicHunter {
  hunter_name: string;
  rank: Rank;
  total_exp: number;
  streak: number;
  stats: Partial<Record<StatKey, number>>;
}

async function fetchHunter(handle: string): Promise<PublicHunter | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("public_hunter", { p_handle: handle });
  return (data as PublicHunter | null) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params;
  const h = await fetchHunter(handle);
  if (!h) return { title: "Hunter not found — The System" };
  const level = progression(h.total_exp).level;
  const title = `${h.hunter_name} · Level ${level} ${h.rank}-Rank Hunter`;
  const description = `${h.hunter_name} is a ${h.rank}-Rank Hunter on The System. Rise and level up your real life.`;
  return { title, description, openGraph: { title, description }, twitter: { card: "summary", title, description } };
}

export default async function PublicHunterPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const h = await fetchHunter(handle);
  if (!h) notFound();

  const prog = progression(h.total_exp);
  const stats = Object.fromEntries(STAT_KEYS.map((k) => [k, h.stats[k] ?? 0])) as Record<StatKey, number>;
  const isMonarch = h.rank === "S";

  return (
    <main className={`mx-auto w-full max-w-md px-4 py-10 ${isMonarch ? "monarch" : ""}`}>
      <header className="mb-5 text-center sys-in">
        <p className="text-[10px] tracking-[0.5em] text-system/55">⟢ THE SYSTEM ⟣</p>
        <h1 className="glow mt-1 text-xl font-black tracking-wide text-system">HUNTER STATUS</h1>
      </header>

      <SysWindow title="STATUS" className="mb-4">
        <div className="flex items-center gap-5">
          <RankBadge rank={h.rank} />
          <div className="flex-1">
            <p className="text-[10px] tracking-widest text-system/55">HUNTER</p>
            <p className="text-xl font-bold text-foreground">{h.hunter_name}</p>
            <p className="mt-1 text-[10px] tracking-widest text-system/55">
              LEVEL <span className="glow text-base font-black text-system">{prog.level}</span>
              <span className="ml-3">🔥 {h.streak}d</span>
            </p>
            <div className="mt-2">
              <ExpBar pct={prog.pct} into={prog.intoLevel} toNext={prog.toNext} />
            </div>
          </div>
        </div>
        <div className="mt-4 border-t border-system/15 pt-2">
          <StatRadar stats={stats} />
        </div>
      </SysWindow>

      <Link
        href="/"
        className="block border border-system/55 bg-system/10 py-3 text-center text-xs font-bold tracking-[0.3em] text-system transition hover:bg-system/20"
        style={{ boxShadow: "0 0 16px color-mix(in srgb, var(--system) 30%, transparent)" }}
      >
        ⟢ RISE WITH THE SYSTEM — CREATE YOUR HUNTER
      </Link>
      <p className="mt-3 text-center text-[10px] leading-relaxed text-system/40">
        Turn your real life into a Solo-Leveling-style RPG. An AI System assigns you quests,
        you gain EXP, and you climb from E-Rank to S-Rank.
      </p>
    </main>
  );
}
