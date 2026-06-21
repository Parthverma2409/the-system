"use client";

import { STAT_KEYS, StatKey, Rank, Vitals } from "@/lib/rpg/engine";

const RANK_COLOR: Record<Rank, string> = {
  E: "#8aa0b5",
  D: "#36c5ff",
  C: "#48e0c0",
  B: "#7CFFB2",
  A: "#ffd66b",
  S: "#b07bff",
};

export function RankBadge({ rank }: { rank: Rank }) {
  const color = RANK_COLOR[rank];
  return (
    <div className="relative flex flex-col items-center">
      <div
        className="flex h-16 w-16 items-center justify-center text-3xl font-black"
        style={{
          color,
          border: `1.5px solid ${color}`,
          background: "rgba(5,12,26,.75)",
          boxShadow: `0 0 14px ${color}66, inset 0 0 14px ${color}22`,
          clipPath:
            "polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)",
          textShadow: `0 0 10px ${color}`,
        }}
      >
        {rank}
      </div>
      <span className="mt-1 text-[9px] tracking-[0.3em]" style={{ color }}>
        RANK
      </span>
    </div>
  );
}

export function ExpBar({ pct, into, toNext }: { pct: number; into: number; toNext: number }) {
  const width = Math.round(Math.min(1, Math.max(0, pct)) * 100);
  return (
    <div className="w-full">
      <div className="mb-1 flex justify-between text-[10px] tracking-widest text-system/70">
        <span>EXP</span>
        <span>
          {into.toLocaleString()} / {toNext.toLocaleString()}
        </span>
      </div>
      <div
        className="relative h-3.5 w-full overflow-hidden bg-black/60"
        style={{ border: "1px solid rgba(54,197,255,.35)", clipPath: "polygon(4px 0,100% 0,calc(100% - 4px) 100%,0 100%)" }}
      >
        <div
          className="exp-fill h-full transition-all duration-700"
          style={{
            width: `${width}%`,
            background: "linear-gradient(90deg, #1b5e86, #36c5ff 70%, #9fe6ff)",
          }}
        />
        {/* moving sheen */}
        <div
          className="pointer-events-none absolute inset-y-0"
          style={{
            left: `${Math.max(0, width - 6)}%`,
            width: "6%",
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,.5), transparent)",
          }}
        />
      </div>
    </div>
  );
}

// HP / MP / FATIGUE vitals — three labelled bars (ref image 2). Fatigue fills
// toward danger (high = bad), so its tint shifts from system → gold → red.
const VITAL_META = {
  hp: { label: "HP", icon: "❤", color: "#7CFFB2" },
  mp: { label: "MP", icon: "✦", color: "#36c5ff" },
  fatigue: { label: "FATIGUE", icon: "⚡", color: "#ffd66b" },
} as const;

function VitalRow({ kind, v }: { kind: keyof Vitals; v: Vitals[keyof Vitals] }) {
  const meta = VITAL_META[kind];
  const width = Math.round(v.pct * 100);
  // Fatigue is "bad when high": escalate the colour as it fills.
  const color =
    kind === "fatigue"
      ? v.pct > 0.75
        ? "#ff5470"
        : v.pct > 0.45
        ? "#ffd66b"
        : "#48e0c0"
      : meta.color;
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-[10px] font-bold tracking-widest" style={{ color }}>
        {meta.icon} {meta.label}
      </span>
      <div
        className="relative h-2.5 flex-1 overflow-hidden bg-black/60"
        style={{ border: `1px solid ${color}40`, clipPath: "polygon(3px 0,100% 0,calc(100% - 3px) 100%,0 100%)" }}
      >
        <div
          className="h-full transition-all duration-700"
          style={{ width: `${width}%`, background: `linear-gradient(90deg, ${color}55, ${color})`, boxShadow: `0 0 8px ${color}99` }}
        />
      </div>
      <span className="w-14 shrink-0 text-right text-[10px] tabular-nums" style={{ color: `${color}cc` }}>
        {v.cur}/{v.max}
      </span>
    </div>
  );
}

export function VitalBars({ vitals }: { vitals: Vitals }) {
  return (
    <div className="space-y-1.5">
      <VitalRow kind="hp" v={vitals.hp} />
      <VitalRow kind="mp" v={vitals.mp} />
      <VitalRow kind="fatigue" v={vitals.fatigue} />
    </div>
  );
}

// SVG radar of the 6 stats with glow.
export function StatRadar({ stats, max = 100 }: { stats: Record<StatKey, number>; max?: number }) {
  const size = 230;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 34;
  const n = STAT_KEYS.length;

  const point = (i: number, value: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const dist = (Math.min(value, max) / max) * r;
    return [cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist];
  };

  const poly = STAT_KEYS.map((k, i) => point(i, stats[k] ?? 0).join(",")).join(" ");

  return (
    <svg width="100%" height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
      <defs>
        <radialGradient id="radarFill" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(54,197,255,.45)" />
          <stop offset="100%" stopColor="rgba(54,197,255,.12)" />
        </radialGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <polygon
          key={f}
          points={STAT_KEYS.map((_, i) => point(i, max * f).join(",")).join(" ")}
          fill="none"
          stroke="rgba(54,197,255,.13)"
        />
      ))}
      {STAT_KEYS.map((k, i) => {
        const [x, y] = point(i, max);
        return <line key={k} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(54,197,255,.16)" />;
      })}
      <polygon points={poly} fill="url(#radarFill)" stroke="#36c5ff" strokeWidth={1.5}
        style={{ filter: "drop-shadow(0 0 6px rgba(54,197,255,.7))" }} />
      {STAT_KEYS.map((k, i) => {
        const [px, py] = point(i, stats[k] ?? 0);
        return <circle key={k} cx={px} cy={py} r={2.5} fill="#9fe6ff" />;
      })}
      {STAT_KEYS.map((k, i) => {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        const lx = cx + Math.cos(angle) * (r + 20);
        const ly = cy + Math.sin(angle) * (r + 20);
        return (
          <text key={k} x={lx} y={ly} fontSize={11} fontWeight={700} fill="#9fe6ff"
            textAnchor="middle" dominantBaseline="middle">
            {k} {stats[k] ?? 0}
          </text>
        );
      })}
    </svg>
  );
}

// Reusable reward popup (ref image 5 — "QUEST REWARDS"). Angular modal over a
// dimmed backdrop listing what you earned. Click anywhere / RECEIVE to dismiss.
export interface RewardItem {
  label: string;
  value: string;
  color?: string;
}
export function RewardsModal({
  title,
  items,
  big = false,
  onClose,
}: {
  title: string;
  items: RewardItem[];
  big?: boolean;
  onClose: () => void;
}) {
  const accent = big ? "var(--gold)" : "var(--system)";
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`notify-in sys-window sys-nodes w-[min(92vw,360px)] ${big ? "glow-gold" : "glow"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sys-header" style={{ color: accent }}>
          [ {title} ]
        </div>
        <div className="p-5">
          <ul className="space-y-2">
            {items.map((it, i) => (
              <li
                key={i}
                className="flex items-center justify-between border-b border-system/10 pb-2 text-sm last:border-0 last:pb-0"
              >
                <span className="tracking-wider text-system/65">{it.label}</span>
                <span className="font-bold tabular-nums" style={{ color: it.color ?? accent, textShadow: `0 0 8px ${it.color ?? accent}88` }}>
                  {it.value}
                </span>
              </li>
            ))}
          </ul>
          <button
            onClick={onClose}
            className="mt-5 w-full border py-2 text-xs font-bold tracking-[0.3em] transition hover:bg-system/10"
            style={{ borderColor: accent, color: accent, boxShadow: `0 0 14px ${accent}33` }}
          >
            RECEIVE
          </button>
        </div>
      </div>
    </div>
  );
}

// Growth sparkline for a stat's history. Falls back to a flat baseline hint
// when there aren't yet two points to draw a line.
export function Sparkline({
  points,
  color = "#36c5ff",
  height = 56,
}: {
  points: number[];
  color?: string;
  height?: number;
}) {
  const w = 280;
  const pad = 4;
  if (points.length < 2) {
    return (
      <div className="flex items-center justify-center text-[10px] tracking-widest text-system/40" style={{ height }}>
        NOT ENOUGH HISTORY YET — TRAIN TO SEE GROWTH
      </div>
    );
  }
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const stepX = (w - pad * 2) / (points.length - 1);
  const coords = points.map((p, i) => {
    const x = pad + i * stepX;
    const y = pad + (height - pad * 2) * (1 - (p - min) / span);
    return [x, y] as const;
  });
  const line = coords.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} ${coords[coords.length - 1][0].toFixed(1)},${height - pad} ${pad},${height - pad}`;
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none">
      <polygon points={area} fill={`${color}22`} />
      <polyline points={line} fill="none" stroke={color} strokeWidth={1.5}
        style={{ filter: `drop-shadow(0 0 4px ${color}aa)` }} />
      {coords.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === coords.length - 1 ? 2.6 : 1.6} fill={i === coords.length - 1 ? "#9fe6ff" : color} />
      ))}
    </svg>
  );
}

// Reusable System window with a [ HEADER ] bar.
export function SysWindow({
  title,
  children,
  className = "",
  delay = 0,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <section
      className={`sys-window sys-nodes sys-in ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {title && <div className="sys-header">[ {title} ]</div>}
      <div className="p-4">{children}</div>
    </section>
  );
}
