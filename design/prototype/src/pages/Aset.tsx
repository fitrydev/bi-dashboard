import { useMemo, useState, useEffect, useRef, type ReactNode } from "react";
import { AlertTriangle, ArrowDown, ArrowUp, ChevronRight, Search, SlidersHorizontal, X } from "lucide-react";
import { Input, PageHeader, Select, Button } from "@/components/ui/primitives";
import { RiskBadge } from "@/components/risk/RiskBadge";
import { ScoreBar } from "@/components/risk/ScoreBar";
import { applyFilters, readFilters } from "@/lib/filter";
import { RISK_LABEL, LEVELS, WARN_LABEL, rows, type Row, type WarnKey } from "@/lib/data";
import { formatAngka, formatLuas, formatRupiahEksak, formatRupiahRingkas, formatSkor } from "@/lib/format";
import { href, useReplaceParams, type Route } from "@/lib/router";
import { HoverTip } from "@/components/ui/HoverTip";
import { cn } from "@/lib/utils";

const PER = 25;
const title = (s: string) => (s === "DKI JAKARTA" ? "DKI Jakarta" : s.toLowerCase().replace(/\b\p{L}/gu, (c) => c.toUpperCase()));

export function WarnIcon({ r }: { r: Row }) {
  if (!r.warnings.length) return null;
  return (
    <HoverTip align="right" tip={<ul>{r.warnings.map((w) => <li key={w}>{WARN_LABEL[w]}</li>)}</ul>}>
      <span role="img" tabIndex={0} aria-label={`${r.warnings.length} peringatan data: ${r.warnings.map((w) => WARN_LABEL[w]).join("; ")}`} className="inline-flex items-center gap-0.5 text-status-warning">
        <AlertTriangle size={14} aria-hidden="true" /><span className="text-label tabular-nums">{r.warnings.length}</span>
      </span>
    </HoverTip>
  );
}

function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const el = ref.current!;
    const foc = () => Array.from(el.querySelectorAll<HTMLElement>("button, select, input, a[href], [tabindex]:not([tabindex='-1'])")).filter((x) => !(x as HTMLButtonElement).disabled);
    foc()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); return; }
      if (e.key !== "Tab") return;
      const f = foc(); if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    const ov = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ov; prev?.focus(); };
  }, [open]); // eslint-disable-line
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} aria-hidden="true" />
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="filter-h" className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto border-t border-rule-strong bg-surface-raised p-4 shadow-overlay">
        <div className="mb-3 flex items-center justify-between"><h2 id="filter-h" className="font-sans text-subtitle font-semibold">Filter aset</h2><button type="button" onClick={onClose} aria-label="Tutup filter" className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center"><X size={18} aria-hidden="true" /></button></div>
        {children}
        <Button variant="primary" className="mt-4 w-full" onClick={onClose}>Selesai</Button>
      </div>
    </div>
  );
}

export function Aset({ route }: { route: Route }) {
  const set = useReplaceParams(route);
  const f = readFilters(route.params);
  const [q, setQ] = useState(f.q);
  const [sheet, setSheet] = useState(false);
  useEffect(() => { const t = setTimeout(() => { if (q !== f.q) set({ q: q || null, hal: null }); }, 250); return () => clearTimeout(t); }, [q]); // eslint-disable-line
  const list = useMemo(() => applyFilters(f), [route.raw]); // eslint-disable-line
  const pages = Math.max(1, Math.ceil(list.length / PER));
  const hal = Math.min(f.hal, pages);
  const view = list.slice((hal - 1) * PER, hal * PER);
  const listVal = list.reduce((s, r) => s + (r.value ?? 0), 0);
  const chg = (k: string) => (v: string) => set({ [k]: v || null, hal: null });
  const active: { k: string; l: string }[] = [];
  if (f.wilayah) active.push({ k: "wilayah", l: `Wilayah: ${title(f.wilayah)}` });
  if (f.jenis) active.push({ k: "jenis", l: `Jenis: ${f.jenis}` });
  if (f.kategori) active.push({ k: "kategori", l: `Kategori: ${RISK_LABEL[f.kategori as keyof typeof RISK_LABEL]}` });
  if (f.pakai) active.push({ k: "pakai", l: `Pemanfaatan: ${f.pakai === "idle" ? "Idle/Kosong" : "Digunakan sendiri"}` });
  if (f.warn) active.push({ k: "warn", l: `Peringatan: ${WARN_LABEL[f.warn as WarnKey]}` });
  const sortBy = (k: string) => set({ sort: k, dir: f.sort === k && f.dir === "desc" ? "asc" : "desc" });
  const Th = ({ k, children, right }: { k: string; children: string; right?: boolean }) => (
    <th scope="col" aria-sort={f.sort === k ? (f.dir === "asc" ? "ascending" : "descending") : "none"} className={cn("sticky top-0 z-10 h-10 bg-surface-sunken px-3 text-label font-medium", right ? "text-right" : "text-left")}>
      <button type="button" onClick={() => sortBy(k)} className={cn("inline-flex items-center gap-1 cursor-pointer", right && "flex-row-reverse")}>
        {children}{f.sort === k && (f.dir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
      </button>
    </th>
  );
  const regions = [...new Set(rows.map((r) => r.region))];
  const controls = (<>
    <Select label="Wilayah" value={f.wilayah} onChange={chg("wilayah")} options={[{ v: "", l: "Semua" }, ...regions.map((r) => ({ v: r, l: title(r) }))]} />
    <Select label="Jenis" value={f.jenis} onChange={chg("jenis")} options={[{ v: "", l: "Semua" }, { v: "Bangunan", l: "Bangunan" }, { v: "Tanah", l: "Tanah" }]} />
    <Select label="Kategori" value={f.kategori} onChange={chg("kategori")} options={[{ v: "", l: "Semua" }, ...LEVELS.map((l) => ({ v: l, l: RISK_LABEL[l] }))]} />
    <Select label="Pemanfaatan" value={f.pakai} onChange={chg("pakai")} options={[{ v: "", l: "Semua" }, { v: "idle", l: "Idle/Kosong" }, { v: "pakai", l: "Digunakan sendiri" }]} />
    <Select label="Peringatan" value={f.warn} onChange={chg("warn")} options={[{ v: "", l: "Semua" }, ...(Object.keys(WARN_LABEL) as WarnKey[]).map((k) => ({ v: k, l: WARN_LABEL[k] }))]} />
  </>);
  return (
    <>
      <PageHeader slim title="Daftar aset" sub="Cari, saring, dan urutkan seluruh aset. Filter tersimpan di alamat halaman sehingga bisa dibagikan." />
      <div className="z-10 -mx-4 border-b border-rule bg-surface px-4 py-3 lg:sticky lg:top-0 lg:-mx-10 lg:px-10">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <label className="relative col-span-2 flex flex-col gap-1 text-label text-ink-muted md:col-span-3 xl:col-span-1">Cari
            <Search size={16} aria-hidden="true" className="pointer-events-none absolute bottom-3 left-2.5 text-ink-subtle lg:bottom-2.5" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama atau ID aset" className="pl-8" type="search" />
          </label>
          <Button className="col-span-2 lg:hidden" onClick={() => setSheet(true)} aria-haspopup="dialog"><SlidersHorizontal size={16} aria-hidden="true" />Filter ({active.length} aktif)</Button>
          <div className="hidden lg:contents">{controls}</div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {active.map((a) => (
            <button key={a.k} type="button" onClick={() => set({ [a.k]: null, hal: null })} className="inline-flex min-h-8 items-center gap-1 rounded-sm border border-rule-strong px-2 text-label cursor-pointer hover:bg-surface-sunken" aria-label={`Hapus filter ${a.l}`}>{a.l}<X size={12} aria-hidden="true" /></button>
          ))}
          {active.length > 0 && <button type="button" onClick={() => { setQ(""); set({ wilayah: null, jenis: null, kategori: null, pakai: null, warn: null, q: null, hal: null }); }} className="text-label underline cursor-pointer min-h-8">Hapus semua</button>}
          <span aria-live="polite" className="ml-auto text-label text-ink-muted tabular-nums">{formatAngka(list.length)} dari {rows.length} aset</span>
        </div>
      </div>

      <Sheet open={sheet} onClose={() => setSheet(false)}><div className="grid gap-3">{controls}</div></Sheet>

      {list.length === 0 ? (
        <div className="py-12 max-w-[68ch]"><p className="text-body-lg">Tidak ada aset yang cocok dengan filter ini.</p><Button className="mt-3" onClick={() => { setQ(""); set({ wilayah: null, jenis: null, kategori: null, pakai: null, warn: null, q: null }); }}>Hapus semua filter</Button></div>
      ) : (<>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[900px] border-collapse text-body">
            <thead>
              <tr className="border-b border-rule-strong">
                <Th k="id">ID</Th><Th k="nama">Nama aset</Th><Th k="wilayah">Wilayah</Th>
                <th scope="col" className="sticky top-0 z-10 h-10 bg-surface-sunken px-3 text-left text-label font-medium">Jenis</th>
                <Th k="nilai" right>Nilai buku</Th><Th k="luas" right>Luas tanah</Th>
                <th scope="col" className="sticky top-0 z-10 h-10 bg-surface-sunken px-3 text-left text-label font-medium">Pemanfaatan</th>
                <Th k="skor">Skor</Th>
                <th scope="col" className="sticky top-0 z-10 h-10 bg-surface-sunken px-3 text-left text-label font-medium">Kategori</th>
                <th scope="col" className="sticky top-0 z-10 h-10 bg-surface-sunken px-3 text-left text-label font-medium"><span className="sr-only">Peringatan</span></th>
              </tr>
            </thead>
            <tbody>
              {view.map((r) => (
                <tr key={r.code} className="border-b border-rule hover:bg-surface-sunken">
                  <td className="h-10 px-3 font-mono text-[13px]">{r.code}</td>
                  <td className="max-w-[260px] truncate px-3" title={r.name}><a className="link" href={href(`/aset/${r.code}`)}>{r.name}</a></td>
                  <td className="px-3 whitespace-nowrap">{title(r.region)}</td><td className="px-3">{r.type}</td>
                  <td className="px-3 text-right tabular-nums" title={r.value ? formatRupiahEksak(r.value) : "Nilai placeholder, belum diisi"}>{r.value ? formatRupiahRingkas(r.value) : <span className="text-ink-subtle">—</span>}</td>
                  <td className="px-3 text-right tabular-nums">{formatLuas(r.land_area_m2)}</td>
                  <td className="px-3 whitespace-nowrap">{r.utilization === "Idle/Kosong" ? "Idle/Kosong" : "Digunakan sendiri"}</td>
                  <td className="px-3"><div className="flex w-28 items-center gap-2">{r.score != null ? <><span className="w-9 text-right font-medium tabular-nums">{formatSkor(r.score)}</span><ScoreBar compact score={r.score} level={r.level} className="w-16" /></> : <span className="text-ink-subtle">—</span>}</div></td>
                  <td className="px-3"><RiskBadge level={r.level} size="sm" override={r.assessment?.critical_override} /></td>
                  <td className="px-3"><WarnIcon r={r} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="md:hidden">
          {view.map((r) => (
            <li key={r.code} className="border-b border-rule">
              <a href={href(`/aset/${r.code}`)} className="flex min-h-16 items-center gap-2 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2"><span className="line-clamp-2 text-body font-medium">{r.name}</span><RiskBadge level={r.level} size="sm" /></span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-label text-ink-muted"><span className="font-mono">{r.code}</span>·<span>{title(r.region)}</span>·<span className="tabular-nums">{formatRupiahRingkas(r.value)}</span><WarnIcon r={r} /></span>
                </span>
                <ChevronRight size={18} aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-rule-strong pt-3 text-label text-ink-muted">
          <span className="tabular-nums">Menampilkan {(hal - 1) * PER + 1}–{Math.min(hal * PER, list.length)} dari {formatAngka(list.length)} · Total nilai buku {formatRupiahRingkas(listVal)}</span>
          <span className="flex items-center gap-2">
            <Button disabled={hal <= 1} onClick={() => set({ hal: String(hal - 1) })}>Sebelumnya</Button>
            <span className="tabular-nums">Hal {hal}/{pages}</span>
            <Button disabled={hal >= pages} onClick={() => set({ hal: String(hal + 1) })}>Berikutnya</Button>
          </span>
        </div>
      </>)}
    </>
  );
}
