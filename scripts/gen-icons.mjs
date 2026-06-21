// Generates the PWA / notification icons (no deps — raw PNG via zlib).
// A glowing cyan "gate" diamond on near-black, matching the System theme.
// Run: node scripts/gen-icons.mjs
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

const OUT = new URL("../public/icons/", import.meta.url);
mkdirSync(OUT, { recursive: true });

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}
function png(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const clamp = (x) => Math.max(0, Math.min(255, Math.round(x)));
const lerp = (a, b, t) => a + (b - a) * t;

function render(size) {
  const buf = Buffer.alloc(size * size * 4);
  const c = (size - 1) / 2;
  const R = size * 0.34; // diamond "radius" in the diamond metric
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - c) / R;
      const dy = (y - c) / R;
      const d = Math.abs(dx) + Math.abs(dy); // diamond distance (1.0 = edge)
      const rad = Math.hypot(x - c, y - c) / (size / 2);

      // background: subtle radial toward near-black at the corners
      let r = lerp(10, 3, rad);
      let g = lerp(22, 6, rad);
      let b = lerp(44, 15, rad);

      // glowing rings at d≈1.0 (outer) and d≈0.58 (inner)
      const ring = (center, sigma, mag) =>
        Math.exp(-((d - center) * (d - center)) / (2 * sigma * sigma)) * mag;
      let glow = ring(1.0, 0.05, 1) + ring(0.58, 0.045, 0.8);
      // central vertical gate slit
      const slit = Math.exp(-(((x - c) / (size * 0.018)) ** 2)) * Math.max(0, 1 - d) * 0.9;
      glow = Math.min(1.6, glow + slit);

      // System cyan #36c5ff → bright #9fe6ff at the core
      const cyR = lerp(54, 159, Math.min(1, glow));
      const cyG = lerp(197, 230, Math.min(1, glow));
      const cyB = 255;
      r = lerp(r, cyR, Math.min(1, glow));
      g = lerp(g, cyG, Math.min(1, glow));
      b = lerp(b, cyB, Math.min(1, glow));

      const i = (y * size + x) * 4;
      buf[i] = clamp(r);
      buf[i + 1] = clamp(g);
      buf[i + 2] = clamp(b);
      buf[i + 3] = 255; // opaque (maskable-friendly)
    }
  }
  return png(size, size, buf);
}

for (const size of [192, 512]) {
  const file = new URL(`icon-${size}.png`, OUT);
  writeFileSync(file, render(size));
  console.log(`wrote public/icons/icon-${size}.png`);
}
