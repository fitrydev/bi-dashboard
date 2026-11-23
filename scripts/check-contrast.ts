// Cek kontras WCAG dari token di app/globals.css (DESIGN.md §8). Jalankan: bun scripts/check-contrast.ts
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const block = (sel: RegExp) => {
  const m = css.match(sel);
  if (!m) throw new Error(`blok tidak ditemukan: ${sel}`);
  return Object.fromEntries([...m[1].matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map((x) => [x[1], x[2]]));
};
const light = block(/:root\s*{([\s\S]*?)\n}\n/);
const dark = { ...light, ...block(/\.dark,\s*\[data-theme="dark"\]\s*{([\s\S]*?)\n}\n/) };

const lin = (c: number) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = (h: string) => {
  const n = parseInt(h.slice(1), 16);
  return 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
};
const ratio = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

// [fg, bg, minimum, jenis]
const pairs = (): [string, string, number][] => {
  const p: [string, string, number][] = [];
  for (const s of ["surface", "surface-raised", "surface-sunken"]) p.push(["ink", s, 4.5], ["ink-muted", s, 4.5], ["ink-subtle", s, 4.5]);
  p.push(["accent-fg", "accent", 4.5], ["destructive-foreground", "status-error", 4.5]);
  for (const s of ["surface", "surface-raised"]) {
    p.push(["focus", s, 3], ["rule-strong", s, 3]);
    for (const k of ["critical", "high", "medium", "low"]) p.push([`risk-${k}`, s, 3], [`risk-${k}-ink`, s, 4.5]);
    p.push(["risk-unrated", s, 3], ["risk-unrated-ink", s, 4.5]);
    for (const k of ["status-error", "status-warning-ink", "status-success-ink"]) p.push([k, s, 4.5]);
  }
  for (const k of ["critical", "high", "medium", "low"]) p.push([`risk-${k}-ink`, `risk-${k}-tint`, 4.5]);
  p.push(["status-warning-ink", "status-warning-bg", 4.5]);
  for (let i = 1; i <= 5; i++) p.push([`heat-fg-${i}`, `heat-${i}`, 4.5]);
  p.push(["rule-strong", "heat-1", 3]); // bingkai sel heatmap (§12.4)
  return p;
};

let ok = 0, bad = 0;
for (const [mode, t] of [["light", light], ["dark", dark]] as const) {
  for (const [fg, bg, min] of pairs()) {
    // ponytail: pasangan dengan token yang tidak ada di blok dilewati
    if (!t[fg] || !t[bg]) { console.log(`SKIP ${mode} ${fg}/${bg} (token tidak ada)`); continue; }
    const r = ratio(t[fg], t[bg]);
    if (r >= min) ok++;
    else { bad++; console.log(`GAGAL ${mode} ${fg} ${t[fg]} / ${bg} ${t[bg]} = ${r.toFixed(2)} < ${min}`); }
  }
}
console.log(`lolos ${ok}, gagal ${bad}`);
process.exit(bad ? 1 : 0);
