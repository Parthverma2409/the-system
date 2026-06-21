"use client";

import { useState } from "react";
import { STAT_KEYS, StatKey, Rank } from "@/lib/rpg/engine";

// Renders a screenshot-ready "Hunter Status" image on a canvas and shares it via
// the Web Share API (or downloads as a fallback). Every share is free marketing —
// the card is styled like the System window and carries the app URL.
export interface ShareData {
  hunterName: string;
  level: number;
  rank: Rank;
  title: string;
  stats: Record<StatKey, number>;
  streak: number;
}

const RANK_COLOR: Record<Rank, string> = {
  E: "#8aa0b5", D: "#36c5ff", C: "#48e0c0", B: "#7CFFB2", A: "#ffd66b", S: "#b07bff",
};

const W = 1080;
const H = 1350;

function draw(ctx: CanvasRenderingContext2D, d: ShareData, origin: string) {
  const accent = RANK_COLOR[d.rank];
  const isMonarch = d.rank === "S";
  const bg0 = isMonarch ? "#0c0902" : "#03060f";

  // background + glow
  ctx.fillStyle = bg0;
  ctx.fillRect(0, 0, W, H);
  const grad = ctx.createRadialGradient(W / 2, 240, 60, W / 2, 240, 900);
  grad.addColorStop(0, `${accent}26`);
  grad.addColorStop(1, "transparent");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // notched frame
  const m = 44;
  const n = 26;
  ctx.save();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.shadowColor = accent;
  ctx.shadowBlur = 24;
  ctx.beginPath();
  ctx.moveTo(m + n, m);
  ctx.lineTo(W - m - n, m);
  ctx.lineTo(W - m, m + n);
  ctx.lineTo(W - m, H - m - n);
  ctx.lineTo(W - m - n, H - m);
  ctx.lineTo(m + n, H - m);
  ctx.lineTo(m, H - m - n);
  ctx.lineTo(m, m + n);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();

  const mono = "ui-monospace, 'SF Mono', Menlo, monospace";
  ctx.textAlign = "center";

  // header
  ctx.fillStyle = `${accent}cc`;
  ctx.font = `600 26px ${mono}`;
  ctx.fillText("⟢  T H E   S Y S T E M  ⟣", W / 2, 130);
  ctx.fillStyle = accent;
  ctx.font = `700 30px ${mono}`;
  ctx.fillText("[ HUNTER STATUS ]", W / 2, 180);

  // rank hexagon badge
  const bx = 200, by = 330, r = 96;
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    const px = bx + Math.cos(a) * r;
    const py = by + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = "rgba(5,12,26,.8)";
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = accent;
  ctx.shadowColor = accent;
  ctx.shadowBlur = 26;
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = accent;
  ctx.font = `900 96px ${mono}`;
  ctx.textBaseline = "middle";
  ctx.fillText(d.rank, bx, by + 4);
  ctx.textBaseline = "alphabetic";
  ctx.font = `600 22px ${mono}`;
  ctx.fillStyle = `${accent}aa`;
  ctx.fillText("RANK", bx, by + r + 34);

  // name + level (right of badge)
  ctx.textAlign = "left";
  ctx.fillStyle = "#e8f6ff";
  ctx.font = `800 64px ${mono}`;
  ctx.fillText(d.hunterName.slice(0, 14), 340, 300);
  ctx.fillStyle = `${accent}cc`;
  ctx.font = `700 30px ${mono}`;
  ctx.fillText(`LEVEL ${d.level}`, 342, 350);
  ctx.fillStyle = "#ffd66b";
  ctx.font = `600 26px ${mono}`;
  ctx.fillText(`✦ ${d.title}`, 342, 396);

  // stat radar
  const cx = W / 2, cy = 850, R = 250, max = 100;
  const pt = (i: number, val: number) => {
    const a = (Math.PI * 2 * i) / 6 - Math.PI / 2;
    const dist = (Math.min(val, max) / max) * R;
    return [cx + Math.cos(a) * dist, cy + Math.sin(a) * dist] as const;
  };
  ctx.strokeStyle = `${accent}33`;
  ctx.lineWidth = 2;
  for (const f of [0.25, 0.5, 0.75, 1]) {
    ctx.beginPath();
    STAT_KEYS.forEach((_, i) => {
      const [x, y] = pt(i, max * f);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.stroke();
  }
  STAT_KEYS.forEach((_, i) => {
    const [x, y] = pt(i, max);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x, y);
    ctx.stroke();
  });
  ctx.beginPath();
  STAT_KEYS.forEach((k, i) => {
    const [x, y] = pt(i, d.stats[k] ?? 0);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = `${accent}3a`;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.shadowColor = accent;
  ctx.shadowBlur = 16;
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.textAlign = "center";
  ctx.font = `700 26px ${mono}`;
  STAT_KEYS.forEach((k, i) => {
    const a = (Math.PI * 2 * i) / 6 - Math.PI / 2;
    const lx = cx + Math.cos(a) * (R + 46);
    const ly = cy + Math.sin(a) * (R + 46);
    ctx.fillStyle = "#bfe9ff";
    ctx.fillText(`${k} ${d.stats[k] ?? 0}`, lx, ly + 8);
  });

  // streak + footer
  ctx.font = `800 40px ${mono}`;
  ctx.fillStyle = "#ffb24d";
  ctx.fillText(`🔥 ${d.streak}-DAY STREAK`, W / 2, 1210);
  ctx.font = `600 24px ${mono}`;
  ctx.fillStyle = `${accent}99`;
  ctx.fillText(origin.replace(/^https?:\/\//, "") || "THE SYSTEM", W / 2, 1270);
}

export default function ShareCard({ data }: { data: ShareData }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function share() {
    if (busy) return;
    setBusy(true);
    setNote(null);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no canvas");
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      draw(ctx, data, origin);

      const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/png"));
      if (!blob) throw new Error("render failed");
      const file = new File([blob], `hunter-status-${data.hunterName}.png`, { type: "image/png" });
      const text = `Level ${data.level} · ${data.rank}-Rank Hunter — ${data.title}. Rise with The System.`;

      const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
      if (nav.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({ files: [file], title: "My Hunter Status", text });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
        setNote("Saved image — post it anywhere ✦");
      }
    } catch {
      setNote("Couldn't generate the card on this device.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-center">
      <button
        onClick={share}
        disabled={busy}
        className="w-full border border-system/55 bg-system/10 py-2.5 text-xs font-bold tracking-[0.3em] text-system transition hover:bg-system/20 disabled:opacity-50"
        style={{ boxShadow: "0 0 16px color-mix(in srgb, var(--system) 30%, transparent)" }}
      >
        {busy ? "GENERATING…" : "📸 SHARE MY STATUS"}
      </button>
      {note && <p className="mt-1.5 text-[10px] tracking-wider text-system/55">{note}</p>}
    </div>
  );
}
