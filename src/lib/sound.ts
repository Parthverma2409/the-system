// Synthesized System SFX via the Web Audio API — no audio assets to ship.
// Sounds are short, bright, and a little retro-digital to match the UI. All calls
// are no-ops on the server, when muted, or where Web Audio is unavailable.

let ctx: AudioContext | null = null;
const MUTE_KEY = "system-muted";

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx ??= new AC();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

export function isMuted(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(MUTE_KEY) === "1";
}
export function setMuted(muted: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
}

function tone(
  c: AudioContext,
  freq: number,
  start: number,
  dur: number,
  type: OscillatorType = "sine",
  peak = 0.18
) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime + start);
  gain.gain.setValueAtTime(0.0001, c.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(peak, c.currentTime + start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(c.currentTime + start);
  osc.stop(c.currentTime + start + dur + 0.02);
}

function play(fn: (c: AudioContext) => void) {
  if (isMuted()) return;
  const c = getCtx();
  if (c) fn(c);
}

// Soft notification ping (System message).
export function playPing() {
  play((c) => tone(c, 880, 0, 0.18, "sine", 0.14));
}

// Quest cleared — two quick rising blips.
export function playClear() {
  play((c) => {
    tone(c, 660, 0, 0.12, "triangle", 0.16);
    tone(c, 988, 0.09, 0.16, "triangle", 0.16);
  });
}

// LEVEL UP — bright ascending arpeggio (C–E–G–C).
export function playLevelUp() {
  play((c) => {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(c, f, i * 0.1, 0.28, "square", 0.12));
  });
}

// RANK UP — bigger, layered fanfare with a low swell.
export function playRankUp() {
  play((c) => {
    tone(c, 130.81, 0, 1.1, "sawtooth", 0.09); // low swell
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) =>
      tone(c, f, 0.12 + i * 0.12, 0.5, "square", 0.13)
    );
  });
}

// Light haptic where supported (mobile).
export function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* ignore */
    }
  }
}
