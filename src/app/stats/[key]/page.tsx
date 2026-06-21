import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  STAT_KEYS,
  StatKey,
  progression,
  abilityPointsEarned,
} from "@/lib/rpg/engine";
import { PROTOCOLS } from "@/lib/rpg/protocols";
import { SysWindow, Sparkline } from "@/components/SystemUI";
import StatTrainer from "@/components/StatTrainer";

export const dynamic = "force-dynamic";

export default async function StatPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const statKey = key.toUpperCase() as StatKey;
  if (!STAT_KEYS.includes(statKey)) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: statRow }, { data: profile }, { data: apRow }, { data: history }, { data: quests }] =
    await Promise.all([
      supabase.from("stats").select("value").eq("user_id", user.id).eq("stat_key", statKey).single(),
      supabase.from("profiles").select("total_exp").eq("id", user.id).single(),
      supabase.from("ability_points").select("spent").eq("user_id", user.id).maybeSingle(),
      supabase
        .from("stat_history")
        .select("value,recorded_at")
        .eq("user_id", user.id)
        .eq("stat_key", statKey)
        .order("recorded_at", { ascending: true })
        .limit(40),
      supabase
        .from("quests")
        .select("id,title,status")
        .eq("user_id", user.id)
        .eq("category", PROTOCOLS[statKey].category),
    ]);

  const value = statRow?.value ?? 0;
  const level = progression(profile?.total_exp ?? 0).level;
  const earned = abilityPointsEarned(level);
  const spent = apRow?.spent ?? 0;
  const protocol = PROTOCOLS[statKey];

  // History points (oldest→newest) with the current value as the final point.
  const points = [...(history ?? []).map((h) => h.value), value];

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <header className="mb-5 flex items-center justify-between sys-in">
        <Link href="/" className="text-[11px] tracking-widest text-system/55 hover:text-system">
          ← STATUS
        </Link>
        <p className="text-[10px] tracking-[0.4em] text-system/45">STAT · {statKey}</p>
      </header>

      <SysWindow title={`${statKey} — ${protocol.domain.toUpperCase()}`} className="mb-5">
        <StatTrainer
          userId={user.id}
          statKey={statKey}
          initialValue={value}
          initialSpent={spent}
          earned={earned}
        />
      </SysWindow>

      <SysWindow title="GROWTH" className="mb-5" delay={80}>
        <Sparkline points={points} />
        <p className="mt-2 text-center text-[10px] tracking-widest text-system/40">
          {points.length >= 2 ? `${points.length} RECORDED POINTS` : "TRAIN TO BUILD YOUR CURVE"}
        </p>
      </SysWindow>

      <SysWindow title="TRAINING PROTOCOL" className="mb-5" delay={120}>
        <p className="mb-3 text-sm italic text-gold/90">▸ {protocol.tagline}</p>
        <ol className="space-y-2">
          {protocol.steps.map((s, i) => (
            <li key={i} className="flex gap-3 text-sm text-foreground/90">
              <span className="shrink-0 font-bold text-system">{String(i + 1).padStart(2, "0")}</span>
              <span className="leading-relaxed">{s}</span>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-[10px] text-system/35">Evidence-based — sources cited in PLAN.md.</p>
      </SysWindow>

      <SysWindow title="QUESTS THAT TRAIN THIS" delay={160}>
        {(quests ?? []).length === 0 ? (
          <p className="py-4 text-center text-xs text-system/50">
            No {protocol.category} quests yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {(quests ?? []).map((q) => (
              <li key={q.id} className="flex items-center justify-between border border-system/15 px-3 py-2 text-sm">
                <span className={q.status === "done" ? "text-system/45 line-through" : ""}>{q.title}</span>
                <span className="text-[9px] tracking-widest text-system/45">{q.status.toUpperCase()}</span>
              </li>
            ))}
          </ul>
        )}
        <Link
          href="/"
          className="mt-3 block w-full border border-dashed border-system/30 py-2 text-center text-xs tracking-widest text-system/60 hover:border-system/60 hover:text-system"
        >
          + ADD A {statKey} QUEST ({protocol.category})
        </Link>
      </SysWindow>
    </main>
  );
}
