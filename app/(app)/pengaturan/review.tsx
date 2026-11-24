"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/ledger/EmptyState";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { resolveUtilizationReview } from "@/lib/actions/settings";
import { UTIL_OPTIONS } from "@/lib/aset/filters";
import { formatAngka, formatWilayah } from "@/lib/format";
import type { ReviewAsset, UtilStatus } from "@/lib/settings/types";
import { Busy, Confirm, Field, Sel } from "./ui";

const UTIL = Object.fromEntries(UTIL_OPTIONS) as Record<UtilStatus, string>;
const MAX = 5000;
const COLS = "sm:grid-cols-[7rem_minmax(0,1fr)_9rem_10rem_9rem]";

export function ReviewTab({ assets, regions }: { assets: ReviewAsset[]; regions: string[] }) {
  const [q, setQ] = useState("");
  const [region, setRegion] = useState("");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<UtilStatus | "">("");
  const [, start] = useTransition();
  const [busy, setBusy] = useState(false);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return assets.filter(
      (a) => (!region || a.region === region) && (!t || a.asset_code.toLowerCase().includes(t) || a.name.toLowerCase().includes(t) || (a.utilization_raw ?? "").toLowerCase().includes(t)),
    );
  }, [assets, q, region]);
  const shownIds = shown.map((a) => a.id);
  const allShown = shown.length > 0 && shownIds.every((id) => sel.has(id));
  const toggleAll = () => setSel((p) => (allShown ? new Set([...p].filter((id) => !shownIds.includes(id))) : new Set([...p, ...shownIds])));
  const toggle = (id: string) =>
    setSel((p) => {
      const n = new Set(p);
      if (!n.delete(id)) n.add(id);
      return n;
    });

  if (assets.length === 0)
    return <EmptyState purpose="Tidak ada aset yang perlu direview." why="Semua status pemanfaatan sudah dikonfirmasi. Aset baru dari impor yang teksnya ambigu akan muncul di sini." />;

  const run = async (newStatus: UtilStatus | null) => {
    const ids = [...sel];
    setBusy(true);
    const r = await resolveUtilizationReview({ asset_ids: ids, status: newStatus });
    setBusy(false);
    if (!r.ok) return void toast.error(r.error);
    toast.success(newStatus ? `${formatAngka(r.data.updated)} aset diubah ke “${UTIL[newStatus]}”` : `${formatAngka(r.data.updated)} aset dikonfirmasi apa adanya`);
    start(() => setSel(new Set()));
  };
  const over = sel.size > MAX;

  return (
    <div className="space-y-4">
      <p className="max-w-[68ch] text-body text-ink-muted">
        Aset dengan status pemanfaatan yang artinya ambigu saat impor (mis. “Produktif”). Pilih aset, lalu tetapkan status barunya atau konfirmasi status yang sekarang. Teks asli dari Excel tidak diubah.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <Field id="rv-q" label="Cari kode, nama, atau teks asli" className="min-w-48 flex-1 basis-48">
          <Input id="rv-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} className="text-base" autoComplete="off" />
        </Field>
        <Field id="rv-region" label="Wilayah">
          <Sel id="rv-region" value={region} onChange={(e) => setRegion(e.target.value)} className="w-full sm:w-56">
            <option value="">Semua wilayah</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                {formatWilayah(r)}
              </option>
            ))}
          </Sel>
        </Field>
      </div>

      <div className="flex min-h-11 items-center gap-3 border-y border-rule-strong py-1">
        <Checkbox id="rv-all" checked={allShown} onCheckedChange={toggleAll} aria-label={`Pilih semua ${formatAngka(shown.length)} aset yang tampil`} data-testid="review-all" />
        <label htmlFor="rv-all" className="text-body text-ink">
          Pilih semua yang tampil ({formatAngka(shown.length)})
        </label>
        <span className="ml-auto text-caption text-ink-muted" aria-live="polite" data-testid="review-count">
          {formatAngka(sel.size)} dipilih dari {formatAngka(assets.length)}
        </span>
      </div>

      {shown.length === 0 ? (
        <p className="py-4 text-body text-ink-muted">Tidak ada aset yang cocok dengan penyaring.</p>
      ) : (
        <>
        <div aria-hidden="true" className={`hidden gap-x-4 border-b border-rule-strong py-1 pl-8 text-label font-medium text-ink sm:grid ${COLS}`}>
          <span>Kode</span>
          <span>Nama</span>
          <span>Wilayah</span>
          <span>Teks asli</span>
          <span>Status</span>
        </div>
        <ul className="divide-y divide-rule" aria-label="Aset perlu review" data-testid="review-list">
          {shown.slice(0, 500).map((a) => (
            <li key={a.id} className="flex items-start gap-3 py-2" data-testid={`review-${a.asset_code}`}>
              <Checkbox id={`rv-${a.id}`} checked={sel.has(a.id)} onCheckedChange={() => toggle(a.id)} className="mt-1" aria-label={`Pilih ${a.asset_code} ${a.name}`} />
              <label htmlFor={`rv-${a.id}`} className={`grid min-w-0 flex-1 cursor-pointer gap-x-4 gap-y-0.5 ${COLS}`}>
                <span className="text-label tabular-nums text-ink-subtle">{a.asset_code}</span>
                <span className="truncate text-body text-ink">{a.name}</span>
                <span className="text-caption text-ink-muted sm:text-body sm:text-ink">{formatWilayah(a.region)}</span>
                <span className="text-caption text-ink-muted sm:text-body sm:text-ink">
                  <span className="sm:hidden">Teks asli: </span>{a.utilization_raw ?? "—"}
                </span>
                <span className="text-caption text-ink-muted sm:text-body sm:text-ink">
                  <span className="sm:hidden">Status: </span>{a.utilization ? UTIL[a.utilization] : "belum ada"}
                </span>
              </label>
            </li>
          ))}
        </ul>
        </>
      )}
      {shown.length > 500 && (
        <p className="text-caption text-ink-muted">
          Menampilkan 500 pertama dari {formatAngka(shown.length)}. “Pilih semua” tetap mencakup seluruh {formatAngka(shown.length)} aset; persempit dengan penyaring bila perlu. {/* ponytail: tanpa virtualisasi; tambah react-virtual bila >5.000 */}
        </p>
      )}

      {sel.size > 0 && <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] flex flex-wrap items-end gap-2 border-t border-rule-strong bg-surface py-2 sm:gap-3 sm:py-3 lg:bottom-0">
        <Field id="rv-status" label="Status baru" className="min-w-40 flex-1 basis-40 sm:flex-none">
          <Sel id="rv-status" value={status} onChange={(e) => setStatus(e.target.value as UtilStatus)} className="w-full">
            <option value="">Pilih status…</option>
            {UTIL_OPTIONS.map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </Sel>
        </Field>
        <Confirm
          title={`Tetapkan status ${formatAngka(sel.size)} aset?`}
          body={<p>Status pemanfaatan diubah menjadi “{status ? UTIL[status] : ""}” dan ditandai sudah direview. Perubahan tercatat di audit.</p>}
          confirmLabel="Tetapkan status"
          onConfirm={() => run(status as UtilStatus)}
          trigger={(open) => (
            <Busy type="button" pending={busy} disabled={!status || over} onClick={open} data-testid="review-set">
              Tetapkan status…
            </Busy>
          )}
        />
        <Confirm
          title={`Konfirmasi status ${formatAngka(sel.size)} aset tanpa mengubahnya?`}
          body={<p>Status pemanfaatan tetap seperti sekarang dan ditandai sudah direview. Perubahan tercatat di audit.</p>}
          confirmLabel="Konfirmasi"
          onConfirm={() => run(null)}
          trigger={(open) => (
            <Button type="button" variant="outline" disabled={busy || over} onClick={open} data-testid="review-confirm">
              Konfirmasi apa adanya
            </Button>
          )}
        />
        {over && <p role="alert" className="basis-full text-caption text-status-error">Maksimal {formatAngka(MAX)} aset per koreksi; kurangi pilihan.</p>}
      </div>}
    </div>
  );
}
