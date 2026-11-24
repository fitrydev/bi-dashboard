"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { StackedShare } from "@/components/charts";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatWilayah } from "@/lib/format";
import { LEVELS, RISK_LABEL } from "@/lib/scoring";
import type { AssetRow } from "@/lib/types";

/** StackedShare butuh state toggle (fungsi tidak bisa dikirim dari server). */
export function ShareChart({ rows }: { rows: AssetRow[] }) {
  const [only, setOnly] = useState(false);
  return <StackedShare rows={rows} onlyAssessed={only} onToggle={setOnly} />;
}

const ALL = "semua";
const TYPES = [
  ["tanah", "Tanah"],
  ["bangunan", "Bangunan"],
  ["gabungan", "Gabungan"],
] as const;

/** Filter dashboard, state di URL (kunci sama dengan lib/dashboard/filters). */
// ponytail: di mobile select dibungkus grid 1 kolom, bukan bottom sheet (DESIGN §7); pindah ke <Sheet> bila filter > 3.
export function FilterBar({ regions }: { regions: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const active = ["wilayah", "jenis", "kategori", "pemanfaatan"].filter((k) => sp.get(k));

  const go = (q: URLSearchParams) => {
    const s = q.toString();
    start(() => router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false }));
  };
  const set = (k: string, v: string) => {
    const q = new URLSearchParams(sp.toString());
    if (v === ALL) q.delete(k);
    else q.set(k, v);
    go(q);
  };

  const field = (k: string, label: string, items: readonly (readonly [string, string])[]) => (
    <div className="grid gap-1 sm:min-w-44">
      <span id={`f-${k}`} className="text-label text-ink-muted">
        {label}
      </span>
      <Select value={sp.get(k) ?? ALL} onValueChange={(v) => set(k, v)}>
        <SelectTrigger aria-labelledby={`f-${k}`} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Semua</SelectItem>
          {sp.get(k) && !items.some(([v]) => v === sp.get(k)) && (
            <SelectItem value={sp.get(k)!}>Tidak dikenal: {sp.get(k)}</SelectItem>
          )}
          {items.map(([v, l]) => (
            <SelectItem key={v} value={v}>
              {l}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div
      role="search"
      aria-label="Filter dashboard"
      aria-busy={pending}
      className="mt-4 grid grid-cols-1 gap-3 border-b border-rule pb-4 sm:flex sm:flex-wrap sm:items-end"
    >
      {field("wilayah", "Wilayah", regions.map((r) => [r, formatWilayah(r)] as const))}
      {field("jenis", "Jenis", TYPES)}
      {field("kategori", "Kategori", LEVELS.map((l) => [l, RISK_LABEL[l]] as const))}
      <div className="flex min-h-11 items-center gap-4 lg:min-h-9">
        {active.length > 0 && (
          <Button type="button" variant="outline" onClick={() => go(new URLSearchParams())}>
            Reset filter
          </Button>
        )}
        <p aria-live="polite" className="text-label text-ink-subtle tabular-nums">
          {pending ? "Memuat ulang angka…" : ""}
        </p>
      </div>
    </div>
  );
}
