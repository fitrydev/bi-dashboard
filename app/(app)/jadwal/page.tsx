import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/ledger/PageHeader";
import { EmptyState } from "@/components/ledger/EmptyState";
import { RiskBadge } from "@/components/risk";
import { ScheduleStatus } from "@/components/risk/ScheduleStatus";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAngka, formatBulan, formatTanggal } from "@/lib/format";
import {
  GROUP_ORDER,
  byDate,
  groupItems,
  jakartaToday,
  monthGrid,
  parseParams,
  shiftBulan,
  type GroupKey,
  type JadwalItem,
  type Params,
} from "@/lib/jadwal/schedule";
import { loadJadwal } from "@/lib/jadwal/load";
import { asetDetail, href } from "@/lib/routes";
import type { Due } from "@/lib/scoring";
import { cn } from "@/lib/utils";
import { SectionBoundary } from "@/components/ledger/SectionBoundary";

export const metadata: Metadata = { title: "Jadwal Monitoring" };

const MULAI = "/aset?dinilai=tidak";
const HARI = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
const GROUP: Record<GroupKey, { title: string; note?: string }> = {
  lewat: { title: "Lewat" },
  segera: { title: "Segera", note: "Jatuh tempo dalam 30 hari." },
  terjadwal: { title: "Terjadwal" },
  belum_ada_tanggal: { title: "Belum ada tanggal monitoring", note: "Aset sudah dinilai, tetapi tanggal monitoring terakhir belum diisi." },
  tak_terjadwal: {
    title: "Tak terjadwal (belum dinilai)",
    note: "Jadwal muncul setelah aset dinilai.",
  },
};
const dayLabel = (iso: string) => formatTanggal(new Date(`${iso}T00:00:00Z`));
const dueOfItem = (i: JadwalItem): Due =>
  i.dueDate && i.days != null && i.status !== "tak_terjadwal" && i.status !== "belum_ada_tanggal"
    ? { status: i.status === "lewat" ? "lewat" : i.days <= 30 ? "segera" : "terjadwal", date: new Date(`${i.dueDate}T00:00:00Z`), days: i.days }
    : { status: "tak-terjadwal" };
const q = (p: Params, o: Partial<Record<"tampil" | "bulan" | "pic", string | null>>) =>
  href("/jadwal", { tampil: p.tampil, pic: p.pic, bulan: p.tampil === "kalender" ? p.bulan : null, ...o });

export default function JadwalPage(props: PageProps<"/jadwal">) {
  return (
    <>
      <PageHeader
        title="Jadwal Monitoring"
        sub="Kapan setiap aset harus dimonitor berikutnya, menurut kategori risikonya."
      />
      <SectionBoundary what="Jadwal monitoring">
        <Suspense fallback={<Skeleton className="mt-6 h-96 w-full bg-rule/60" />}>
          <Body sp={props.searchParams} />
        </Suspense>
      </SectionBoundary>
    </>
  );
}

async function Body({ sp }: { sp: PageProps<"/jadwal">["searchParams"] }) {
  const all = await loadJadwal();
  const today = jakartaToday();
  const pics = [...new Set(all.map((i) => i.pic).filter((x): x is string => !!x))].sort();
  const p = parseParams(await sp, pics, today);
  const items = p.pic ? all.filter((i) => i.pic === p.pic) : all;

  if (all.every((a) => a.status === "tak_terjadwal"))
    return (
      <div className="pt-8">
        <EmptyState
          purpose="Belum ada aset terjadwal."
          why="Jadwal dihitung dari kategori risiko dan tanggal monitoring terakhir, jadi aset harus dinilai lebih dulu."
          next={
            <Button asChild>
              <Link href={MULAI}>Mulai penilaian</Link>
            </Button>
          }
        />
      </div>
    );

  return (
    <div className="pt-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <nav aria-label="Tampilan jadwal" className="inline-flex border border-rule-strong">
          {(["daftar", "kalender"] as const).map((t) => (
            <Link
              key={t}
              href={q(p, { tampil: t })}
              aria-current={p.tampil === t ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 items-center px-4 text-label lg:min-h-9",
                p.tampil === t ? "bg-ink font-medium text-surface" : "text-ink hover:bg-rule/40",
              )}
            >
              {t === "daftar" ? "Daftar" : "Kalender"}
            </Link>
          ))}
        </nav>
        <form action="/jadwal" className="flex items-end gap-2">
          <input type="hidden" name="tampil" value={p.tampil} />
          {p.tampil === "kalender" && <input type="hidden" name="bulan" value={p.bulan} />}
          <label className="flex flex-col gap-1 text-label text-ink-muted">
            PIC
            <select
              name="pic"
              defaultValue={p.pic ?? ""}
              className="min-h-11 border border-rule-strong bg-surface px-2 text-body text-ink lg:min-h-9"
            >
              <option value="">Semua PIC</option>
              {pics.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" variant="outline">
            Terapkan
          </Button>
        </form>
      </div>
      {p.tampil === "daftar" ? <Daftar items={items} /> : <Kalender items={items} p={p} today={today} />}
    </div>
  );
}

function Row({ i }: { i: JadwalItem }) {
  return (
    <li className="grid grid-cols-1 justify-items-start gap-x-4 gap-y-1 border-b border-rule py-3 sm:justify-items-stretch sm:grid-cols-[1fr_auto_auto] sm:items-center">
      <Link href={asetDetail(i.code)} className="link min-w-0">
        <span className="font-mono text-label text-ink-muted">{i.code}</span>{" "}
        <span className="text-body text-ink">{i.name}</span>
      </Link>
      <RiskBadge level={i.category ?? "unrated"} />
      <ScheduleStatus due={dueOfItem(i)} />
    </li>
  );
}

function Daftar({ items }: { items: JadwalItem[] }) {
  const g = groupItems(items);
  const shown = GROUP_ORDER.filter((k) => g[k].length > 0);
  if (shown.length === 0)
    return <p className="pt-8 text-body text-ink-muted">Tidak ada aset untuk PIC ini.</p>;
  return (
    <>
      {shown.map((k) => (
        <section key={k} aria-labelledby={`g-${k}`} className="mt-8">
          <h2 id={`g-${k}`} className="text-title text-ink">
            {GROUP[k].title} <span className="text-ink-muted tabular-nums">({formatAngka(g[k].length)})</span>
          </h2>
          {GROUP[k].note && <p className="mt-1 text-body text-ink-muted">{GROUP[k].note}</p>}
          {k === "tak_terjadwal" && (
            <p className="mt-1 text-body">
              <Link href={MULAI} className="link inline-flex min-h-11 items-center lg:min-h-0">
                Nilai aset yang belum dinilai
              </Link>
            </p>
          )}
          <ul className="mt-3 border-t border-rule">
            {g[k].map((i) => (
              <Row key={i.code} i={i} />
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}

function Kalender({ items, p, today }: { items: JadwalItem[]; p: Params; today: string }) {
  const map = byDate(items, p.bulan);
  const weeks = monthGrid(p.bulan);
  const label = formatBulan(new Date(`${p.bulan}-01T00:00:00Z`));
  const total = [...map.values()].reduce((a, l) => a + l.length, 0);
  const nav = (n: number, text: string) => (
    <Link href={q(p, { bulan: shiftBulan(p.bulan, n) })} className="link inline-flex min-h-11 items-center lg:min-h-0">
      {text}
    </Link>
  );
  return (
    <section className="mt-6" aria-label={`Kalender ${label}`}>
      <div className="flex items-center justify-between gap-4">
        {nav(-1, "← Bulan sebelumnya")}
        <h2 className="text-title text-ink">{label}</h2>
        {nav(1, "Bulan berikutnya →")}
      </div>
      {total === 0 && <p className="mt-4 text-body text-ink-muted">Tidak ada aset jatuh tempo pada bulan ini.</p>}
      {/* desktop: tabel Senin-Minggu */}
      <table className="mt-4 hidden w-full table-fixed border-collapse md:table">
        <caption className="sr-only">
          Aset jatuh tempo monitoring, {label}: {total} aset
        </caption>
        <thead>
          <tr>
            {HARI.map((h) => (
              <th key={h} scope="col" className="border border-rule px-2 py-1 text-left text-label font-medium text-ink-muted">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((w, wi) => (
            <tr key={wi}>
              {w.map((d, di) => {
                const l = d ? (map.get(d) ?? []) : [];
                return (
                  <td key={di} className={cn("h-24 border border-rule p-1.5 align-top", !d && "bg-rule/20", d === today && "bg-rule/40")}>
                    {d && (
                      <>
                        <div className="flex items-baseline justify-between text-label text-ink-muted">
                          <span className="tabular-nums">{Number(d.slice(8))}</span>
                          {d === today && <span className="font-medium text-ink">Hari ini</span>}
                        </div>
                        {l.length > 0 && (
                          <ul className="mt-1 space-y-0.5 text-label">
                            {l.slice(0, 2).map((i) => (
                              <li key={i.code} className="truncate">
                                <Link href={asetDetail(i.code)} className="link" title={i.name}>
                                  {i.name}
                                </Link>
                              </li>
                            ))}
                            {l.length > 2 && <li className="text-ink-muted">+{formatAngka(l.length - 2)} aset lain</li>}
                          </ul>
                        )}
                      </>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {/* mobile: list per tanggal */}
      <div className="mt-4 md:hidden">
        {[...map.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([d, l]) => (
            <section key={d} aria-label={dayLabel(d)} className="mt-4">
              <h3 className="text-body font-medium text-ink">
                {dayLabel(d)}
                {d === today && <span className="ml-2 text-label">(Hari ini)</span>}
              </h3>
              <ul className="border-t border-rule">
                {l.map((i) => (
                  <Row key={i.code} i={i} />
                ))}
              </ul>
            </section>
          ))}
        {today.startsWith(p.bulan) && !map.has(today) && map.size > 0 && (
          <p className="mt-4 text-label text-ink-muted">Hari ini: {dayLabel(today)} (tidak ada jatuh tempo).</p>
        )}
      </div>
    </section>
  );
}
