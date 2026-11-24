"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { startTransition, useEffect, useMemo, useOptimistic, useRef, useState, useTransition } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Download, Search, SlidersHorizontal, Trash2, TriangleAlert, X } from "lucide-react";
import { EmptyState } from "@/components/ledger/EmptyState";
import { RiskBadge, ScheduleStatus } from "@/components/risk";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  COLUMN_KEYS,
  DEFAULT_COLUMNS,
  DEFAULT_SORT,
  JADWAL_KEYS,
  JADWAL_LABEL,
  TYPE_OPTIONS,
  UTIL_OPTIONS,
  WARN_KEYS,
  applyAsetFilters,
  focusAfterRemove,
  parseAsetFilters,
  rowsReducer,
  serializeAsetFilters,
  sortRows,
  type AsetListRow,
  type ColumnKey,
  type SortKey,
} from "@/lib/aset/filters";
import { formatAngka, formatRupiahEksak, formatRupiahRingkas, formatSkor, formatWilayah } from "@/lib/format";
import { asetDetail } from "@/lib/routes";
import { LEVELS, RISK_LABEL, WARN_LABEL, type Due } from "@/lib/scoring";
import { cn } from "@/lib/utils";
import { deleteAset } from "./delete";

type Opt = readonly [string, string];
const FILTER_KEYS = ["wilayah", "jenis", "kategori", "pemanfaatan", "warn", "dinilai", "jadwal"] as const;
const FILTER_LABEL: Record<(typeof FILTER_KEYS)[number], string> = {
  wilayah: "Wilayah", jenis: "Jenis", kategori: "Kategori", pemanfaatan: "Pemanfaatan",
  warn: "Peringatan data", dinilai: "Penilaian", jadwal: "Status jadwal",
};
const COL_LABEL: Record<ColumnKey, string> = {
  wilayah: "Wilayah", jenis: "Jenis", pemanfaatan: "Pemanfaatan", nilai: "Nilai buku",
  kategori: "Kategori", skor: "Skor", jadwal: "Jadwal", peringatan: "Peringatan",
};
const VIRTUAL_ABOVE = 200;
const ROW_H = 40;

const optionsFor = (regions: string[]): Record<(typeof FILTER_KEYS)[number], Opt[]> => ({
  wilayah: regions.map((r) => [r, formatWilayah(r)]),
  jenis: TYPE_OPTIONS,
  kategori: LEVELS.map((l) => [l, RISK_LABEL[l]]),
  pemanfaatan: UTIL_OPTIONS,
  warn: WARN_KEYS.map((k) => [k, WARN_LABEL[k]]),
  dinilai: [["ya", "Sudah dinilai"], ["tidak", "Belum dinilai"]],
  jadwal: JADWAL_KEYS.map((k) => [k, JADWAL_LABEL[k]]),
});

function dueOf(r: AsetListRow): Due | null {
  if (!r.due_date || r.days == null) return null;
  if (r.schedule_status === "lewat") return { status: "lewat", date: new Date(`${r.due_date}T00:00:00Z`), days: r.days };
  if (r.schedule_status === "terjadwal")
    return { status: r.days <= 30 ? "segera" : "terjadwal", date: new Date(`${r.due_date}T00:00:00Z`), days: r.days };
  return null;
}
const noDue = (r: AsetListRow) => (r.schedule_status === "belum_ada_tanggal" ? "Belum ada tanggal" : "Tak terjadwal");

function Nilai({ r, short }: { r: AsetListRow; short?: boolean }) {
  if (r.value == null)
    return (
      <span
        className="inline-flex items-center gap-1 text-ink-muted"
        title={r.flags.value_placeholder ? "Nilai buku placeholder (Rp1), dikecualikan dari total" : "Nilai buku kosong"}
      >
        <TriangleAlert size={14} aria-hidden="true" className="text-status-warning-ink" />
        <span aria-hidden="true">—</span>
        <span className="sr-only">{r.flags.value_placeholder ? "Nilai placeholder" : "Nilai kosong"}</span>
      </span>
    );
  return short ? <>{formatRupiahRingkas(r.value)}</> : <span title={formatRupiahEksak(r.value)}>{formatRupiahRingkas(r.value)}</span>;
}

export function AsetList({ rows: serverRows, regions, canEdit = false }: { rows: AsetListRow[]; regions: string[]; canEdit?: boolean }) {
  // Hapus lunak optimistik: baris hilang dulu; kembali otomatis bila aksi gagal (transition selesai tanpa revalidasi).
  const [rows, applyRows] = useOptimistic(serverRows, rowsReducer);
  const tableRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const f = useMemo(() => parseAsetFilters(sp), [sp]);
  const options = useMemo(() => optionsFor(regions), [regions]);
  const params = useMemo(() => serializeAsetFilters(f), [f]);
  const cols = f.columns ?? DEFAULT_COLUMNS;
  const sort = f.sort ?? DEFAULT_SORT;

  const go = (q: URLSearchParams) => {
    const s = q.toString();
    start(() => router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false }));
  };
  const setParam = (k: string, v: string) => {
    const q = new URLSearchParams(params);
    if (v) q.set(k, v);
    else q.delete(k);
    go(q);
  };
  const clearAll = () => {
    const q = new URLSearchParams();
    for (const k of ["kolom", "urut"]) if (params.get(k)) q.set(k, params.get(k)!);
    setResetKey((n) => n + 1);
    go(q);
  };

  // pencarian: input tak terkendali, ke URL setelah 250ms; `resetKey` mengosongkan input saat filter dihapus
  const [resetKey, setResetKey] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const onSearch = (v: string) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setParam("q", v.trim()), 250);
  };
  useEffect(() => () => clearTimeout(timer.current), []);

  const filtered = useMemo(() => applyAsetFilters(rows, f), [rows, f]);
  const total = useMemo(() => filtered.reduce((s, r) => s + (r.value ?? 0), 0), [filtered]);

  // chip filter aktif (dari parameter yang dikenal)
  const chips = FILTER_KEYS.flatMap((k) => {
    const v = params.get(k);
    if (!v) return [];
    const label = options[k].find(([o]) => o.toLowerCase() === v.toLowerCase())?.[1];
    return [{ k, text: label ? `${FILTER_LABEL[k]}: ${label}` : `Wilayah tidak dikenal: ${v}` }];
  }).concat(f.q ? [{ k: "q" as (typeof FILTER_KEYS)[number], text: `Cari: ${f.q}` }] : []);
  const activeCount = chips.length;

  const onDelete = (row: AsetListRow) => {
    // Fokus (DESIGN §8): ke tombol hapus baris berikut/sebelumnya, atau wadah tabel bila kosong/tak dirender.
    const next = focusAfterRemove(sortRows(filtered, sort).map((r) => r.code), row.code);
    startTransition(async () => {
      applyRows({ type: "remove", code: row.code });
      requestAnimationFrame(() => {
        const el = next && tableRef.current?.querySelector<HTMLElement>(`[data-del="${CSS.escape(next)}"]`);
        (el || tableRef.current)?.focus();
      });
      await deleteAset(row.code, row.name, (restore) =>
        startTransition(async () => {
          applyRows({ type: "add", row });
          await restore();
        }),
      );
    });
  };

  const toggleSort = (key: SortKey) => {
    const dir = sort.key === key ? (sort.dir === "asc" ? "desc" : "asc") : ["nilai", "skor", "kategori"].includes(key) ? "desc" : "asc";
    setParam("urut", `${key}:${dir}`);
  };

  return (
    <div aria-busy={pending}>
      <div role="search" aria-label="Filter daftar aset" className="sticky top-0 z-10 -mx-4 border-b border-rule bg-surface px-4 pt-4 pb-3 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 lg:max-w-80 lg:flex-none lg:basis-80">
            <Search size={16} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-muted" />
            <Input
              type="search"
              aria-label="Cari nama atau ID aset"
              placeholder="Cari nama atau ID aset"
              key={resetKey}
              defaultValue={f.q ?? ""}
              onChange={(e) => onSearch(e.target.value)}
              className="pl-9 text-base lg:text-body"
            />
          </div>
          <MobileFilter rows={rows} f={f} options={options} count={activeCount} apply={(q) => go(q)} />
          <div className="hidden flex-wrap items-center gap-2 lg:flex">
            {FILTER_KEYS.map((k) => (
              <DropdownMenu key={k}>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline">
                    {FILTER_LABEL[k]}
                    <ChevronDown aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="max-h-80 overflow-y-auto">
                  <DropdownMenuRadioGroup value={params.get(k) ?? ""} onValueChange={(v) => setParam(k, v)}>
                    <DropdownMenuRadioItem value="">Semua</DropdownMenuRadioItem>
                    {options[k].map(([v, l]) => (
                      <DropdownMenuRadioItem key={v} value={v}>
                        {l}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            ))}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline">
                  <SlidersHorizontal aria-hidden="true" />
                  Atur kolom
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {COLUMN_KEYS.map((k) => (
                  <DropdownMenuCheckboxItem
                    key={k}
                    checked={cols.includes(k)}
                    onSelect={(e) => e.preventDefault()}
                    onCheckedChange={(on) => {
                      const next = COLUMN_KEYS.filter((c) => (c === k ? on : cols.includes(c)));
                      setParam("kolom", next.length === DEFAULT_COLUMNS.length && DEFAULT_COLUMNS.every((c) => next.includes(c)) ? "" : next.join(",") || "none");
                    }}
                  >
                    {COL_LABEL[k]}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <Button asChild variant="outline" className="min-h-11 lg:min-h-0">
            <a href={`/export/csv?${sp.toString()}`} download>
              <Download aria-hidden="true" />
              Ekspor
            </a>
          </Button>
          <p aria-live="polite" className="ml-auto text-label text-ink-muted tabular-nums">
            {formatAngka(filtered.length)} dari {formatAngka(rows.length)} aset
          </p>
        </div>
        {chips.length > 0 && (
          <ul aria-label="Filter aktif" className="mt-3 flex flex-wrap items-center gap-2">
            {chips.map((c) => (
              <li key={c.k} className="inline-flex items-center gap-1 rounded-sm border border-rule-strong pl-2 text-label text-ink">
                {c.text}
                <button
                  type="button"
                  aria-label={`Hapus filter ${c.text}`}
                  onClick={() => {
                    if (c.k === ("q" as string)) setResetKey((n) => n + 1);
                    setParam(c.k, "");
                  }}
                  className="grid size-11 place-items-center lg:size-6"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </li>
            ))}
            <li>
              <Button type="button" variant="link" onClick={clearAll} className="min-h-11 lg:min-h-0">
                Hapus semua
              </Button>
            </li>
          </ul>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          purpose={rows.length === 0 ? "Belum ada aset aktif." : "Tidak ada aset yang cocok dengan filter ini."}
          why={rows.length === 0 ? "Aset muncul di sini setelah data diimpor atau ditambahkan." : "Longgarkan satu filter atau ubah kata pencarian."}
          next={
            activeCount > 0 && (
              <Button type="button" variant="outline" onClick={clearAll}>
                Hapus semua filter
              </Button>
            )
          }
        />
      ) : (
        <>
          <ul aria-label="Daftar aset" className="border-b border-rule lg:hidden">
            {sortRows(filtered, sort).map((r) => {
              const due = dueOf(r);
              return (
                <li key={r.code} className="border-t border-rule">
                  <Link href={asetDetail(r.code)} className="flex min-h-16 items-center gap-3 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-3">
                        <span className="line-clamp-2 text-body font-medium text-ink">{r.name}</span>
                        <RiskBadge level={r.level} override={r.assessment?.critical_override} />
                      </span>
                      <span className="mt-1 block text-caption text-ink-muted">
                        <span className="font-mono">{r.code}</span> · {formatWilayah(r.region)} · <Nilai r={r} short />
                      </span>
                      {due && (due.status === "lewat" || due.status === "segera") && (
                        <ScheduleStatus due={due} className="mt-1" />
                      )}
                    </span>
                    <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-ink" />
                  </Link>
                </li>
              );
            })}
          </ul>
          <Table rows={filtered} cols={cols} sort={sort} toggleSort={toggleSort} onDelete={canEdit ? onDelete : undefined} scrollerRef={tableRef} />
        </>
      )}
      <p className="mt-3 border-t border-rule-strong pt-3 text-label text-ink-muted tabular-nums">
        Menampilkan {formatAngka(filtered.length)} dari {formatAngka(rows.length)} aset · Total nilai buku {formatRupiahRingkas(total)}
        <span className="block lg:inline lg:before:content-['_·_']">Nilai placeholder dikecualikan.</span>
      </p>
    </div>
  );
}

function Table({
  rows,
  cols,
  sort,
  toggleSort,
  onDelete,
  scrollerRef: scroller,
}: {
  rows: AsetListRow[];
  cols: readonly ColumnKey[];
  sort: { key: SortKey; dir: "asc" | "desc" };
  toggleSort: (k: SortKey) => void;
  onDelete?: (r: AsetListRow) => void;
  scrollerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const data = useMemo(() => sortRows(rows, sort), [rows, sort]);
  const columns = useMemo<ColumnDef<AsetListRow>[]>(() => {
    const num = "text-right tabular-nums";
    const all: Record<"id" | "nama" | ColumnKey, ColumnDef<AsetListRow> & { sk: SortKey; cls?: string }> = {
      id: { id: "id", sk: "id", header: "ID", cell: (c) => <span className="font-mono text-label">{c.row.original.code}</span> },
      nama: {
        id: "nama", sk: "nama", header: "Nama",
        cell: (c) => (
          <Link href={asetDetail(c.row.original.code)} className="link block max-w-[32ch] truncate" title={c.row.original.name}>
            {c.row.original.name}
          </Link>
        ),
      },
      wilayah: { id: "wilayah", sk: "wilayah", header: "Wilayah", cell: (c) => formatWilayah(c.row.original.region) },
      jenis: { id: "jenis", sk: "jenis", header: "Jenis", cell: (c) => c.row.original.type },
      pemanfaatan: { id: "pemanfaatan", sk: "pemanfaatan", header: "Pemanfaatan", cell: (c) => c.row.original.utilization ?? "—" },
      nilai: { id: "nilai", sk: "nilai", header: "Nilai buku", cls: num, cell: (c) => <Nilai r={c.row.original} /> },
      kategori: {
        id: "kategori", sk: "kategori", header: "Kategori",
        cell: (c) => <RiskBadge level={c.row.original.level} override={c.row.original.assessment?.critical_override} />,
      },
      skor: {
        id: "skor", sk: "skor", header: "Skor", cls: num,
        cell: (c) =>
          c.row.original.score == null ? (
            <span className="text-ink-subtle"><span aria-hidden="true">—</span><span className="sr-only">Belum dinilai</span></span>
          ) : (
            formatSkor(c.row.original.score)
          ),
      },
      jadwal: {
        id: "jadwal", sk: "jadwal", header: "Jadwal",
        cell: (c) => {
          const d = dueOf(c.row.original);
          return d ? <ScheduleStatus due={d} /> : <span className="text-label text-ink-muted">{noDue(c.row.original)}</span>;
        },
      },
      peringatan: {
        id: "peringatan", sk: "id", header: "Peringatan", enableSorting: false,
        cell: (c) => {
          const w = c.row.original.warnings;
          return w.length ? (
            <span className="inline-flex items-center gap-1 text-label text-status-warning-ink" title={w.map((k) => WARN_LABEL[k]).join("\n")}>
              <TriangleAlert size={14} aria-hidden="true" />
              {w.length}
              <span className="sr-only"> peringatan: {w.map((k) => WARN_LABEL[k]).join("; ")}</span>
            </span>
          ) : (
            <span className="text-ink-subtle">—</span>
          );
        },
      },
    };
    const defs: ColumnDef<AsetListRow>[] = (["id", "nama", ...cols] as const).map((k) => ({ ...all[k], meta: { sk: all[k].sk, cls: all[k].cls } }));
    if (onDelete)
      defs.push({
        id: "aksi", enableSorting: false, meta: { sk: "id", cls: "w-0 text-right" },
        header: () => <span className="sr-only">Aksi</span>,
        cell: (c) => (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            data-del={c.row.original.code}
            aria-label={`Hapus ${c.row.original.name}`}
            title="Hapus aset"
            onClick={() => onDelete(c.row.original)}
          >
            <Trash2 aria-hidden="true" />
          </Button>
        ),
      });
    return defs;
  }, [cols, onDelete]);

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table; memo manual di atas
  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(), manualSorting: true });
  const tr = table.getRowModel().rows;
  const virtual = tr.length > VIRTUAL_ABOVE;
  const v = useVirtualizer({ count: tr.length, getScrollElement: () => scroller.current, estimateSize: () => ROW_H, overscan: 12, enabled: virtual });
  const items = virtual ? v.getVirtualItems() : tr.map((_, i) => ({ index: i, start: 0, end: 0 }));
  const padTop = virtual && items.length ? items[0].start : 0;
  const padBottom = virtual && items.length ? v.getTotalSize() - items[items.length - 1].end : 0;
  const n = columns.length;

  return (
    <div ref={scroller} role="region" aria-label="Tabel aset" tabIndex={0} className="hidden max-h-[70vh] overflow-auto lg:block">
      <table className="w-full border-collapse text-body">
        <thead className="sticky top-0 z-10 bg-surface-sunken">
          <tr className="h-10 border-b border-rule-strong">
            {table.getHeaderGroups()[0].headers.map((h) => {
              const meta = h.column.columnDef.meta as { sk: SortKey; cls?: string };
              const sortable = h.column.columnDef.enableSorting !== false;
              const on = sortable && sort.key === meta.sk;
              return (
                <th
                  key={h.id}
                  scope="col"
                  aria-sort={on ? (sort.dir === "asc" ? "ascending" : "descending") : sortable ? "none" : undefined}
                  className={cn("px-3 text-label font-medium whitespace-nowrap", meta.cls ?? "text-left", h.id === "id" && "sticky left-0 z-20 bg-surface-sunken")}
                >
                  {sortable ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(meta.sk)}
                      className={cn("inline-flex min-h-6 items-center gap-1", meta.cls?.includes("text-right") && "flex-row-reverse")}
                    >
                      {flexRender(h.column.columnDef.header, h.getContext())}
                      {on ? (sort.dir === "asc" ? <ArrowUp size={12} aria-hidden="true" /> : <ArrowDown size={12} aria-hidden="true" />) : <span className="w-3" />}
                    </button>
                  ) : (
                    flexRender(h.column.columnDef.header, h.getContext())
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {padTop > 0 && <tr aria-hidden="true" style={{ height: padTop }}><td colSpan={n} /></tr>}
          {items.map((it) => {
            const row = tr[it.index];
            return (
              <tr key={row.id} style={{ height: ROW_H }} className="group border-b border-rule hover:bg-surface-sunken">
                {row.getVisibleCells().map((c) => {
                  const meta = c.column.columnDef.meta as { cls?: string };
                  return (
                    <td
                      key={c.id}
                      className={cn("px-3 whitespace-nowrap", meta.cls, c.column.id === "id" && "sticky left-0 z-[1] bg-surface group-hover:bg-surface-sunken")}
                    >
                      {flexRender(c.column.columnDef.cell, c.getContext())}
                    </td>
                  );
                })}
              </tr>
            );
          })}
          {padBottom > 0 && <tr aria-hidden="true" style={{ height: padBottom }}><td colSpan={n} /></tr>}
        </tbody>
      </table>
    </div>
  );
}

/** Bottom sheet filter (mobile). Draft lokal; "Terapkan" menulis ke URL. */
function MobileFilter({
  rows,
  f,
  options,
  count,
  apply,
}: {
  rows: AsetListRow[];
  f: ReturnType<typeof parseAsetFilters>;
  options: ReturnType<typeof optionsFor>;
  count: number;
  apply: (q: URLSearchParams) => void;
}) {
  const [open, setOpen] = useState(false);
  const base = useMemo(() => serializeAsetFilters(f), [f]);
  const [draft, setDraft] = useState(base);
  const onOpenChange = (o: boolean) => {
    if (o) setDraft(new URLSearchParams(base));
    setOpen(o);
  };
  const hits = useMemo(() => applyAsetFilters(rows, parseAsetFilters(draft)).length, [rows, draft]);
  const set = (k: string, v: string) =>
    setDraft((d) => {
      const n = new URLSearchParams(d);
      if (v) n.set(k, v);
      else n.delete(k);
      return n;
    });
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button type="button" variant="outline" className="lg:hidden">
          {count ? `Filter (${count} aktif)` : "Filter"}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85dvh] gap-0 rounded-t-sm p-0">
        <SheetHeader className="border-b border-rule">
          <SheetTitle>Filter aset</SheetTitle>
          <SheetDescription className="sr-only">Pilih filter lalu terapkan.</SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
          {FILTER_KEYS.map((k) => (
            <fieldset key={k}>
              <legend className="mb-1 text-label font-medium text-ink">{FILTER_LABEL[k]}</legend>
              {([["", "Semua"], ...options[k]] as Opt[]).map(([v, l]) => (
                <label key={v} className="flex min-h-11 cursor-pointer items-center gap-3 text-body">
                  <input type="radio" name={`m-${k}`} checked={(draft.get(k) ?? "") === v} onChange={() => set(k, v)} className="size-5 accent-[var(--ink)]" />
                  {l}
                </label>
              ))}
            </fieldset>
          ))}
        </div>
        <SheetFooter className="sticky bottom-0 flex-row gap-3 border-t border-rule bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button type="button" variant="outline" onClick={() => setDraft(new URLSearchParams([...draft].filter(([k]) => !(FILTER_KEYS as readonly string[]).includes(k))))}>
            Reset
          </Button>
          <Button
            type="button"
            className="flex-1"
            onClick={() => {
              apply(draft);
              setOpen(false);
            }}
          >
            Terapkan ({formatAngka(hits)} aset)
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
