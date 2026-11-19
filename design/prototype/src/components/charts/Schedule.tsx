import { Info } from "lucide-react";
import { rows, stats, TODAY } from "@/lib/data";
import { dueOf } from "@/lib/scoring";
import { formatAngka, formatTanggal } from "@/lib/format";

export function Schedule() {
  const dues = rows.map((r) => ({ r, d: dueOf(r) }));
  const c = {
    lewat: dues.filter((x) => x.d.status === "lewat").length,
    segera: dues.filter((x) => x.d.status === "segera").length,
    terjadwal: dues.filter((x) => x.d.status === "terjadwal").length,
    tak: dues.filter((x) => x.d.status === "tak-terjadwal").length,
  };
  const futureMon = rows.filter((r) => r.flags.monitored_in_future).length;
  const line = (label: string, n: number, hint: string, strong?: boolean) => (
    <li className="grid grid-cols-[1fr_auto] items-baseline gap-x-4 border-b border-rule py-2.5">
      <div><span className={strong ? "font-medium" : ""}>{label}</span><span className="block text-label text-ink-subtle">{hint}</span></div>
      <span className="font-serif text-title tabular-nums">{formatAngka(n)}</span>
    </li>
  );
  return (
    <div>
      <ul className="max-w-2xl border-t border-rule">
        {line("Lewat jadwal", c.lewat, "Jatuh tempo sebelum " + formatTanggal(TODAY) + ".")}
        {line("Jatuh tempo ≤ 30 hari", c.segera, "Perlu disiapkan bulan ini.")}
        {line("Terjadwal", c.terjadwal, "Lebih dari 30 hari lagi.")}
        {line("Belum dapat dijadwalkan", c.tak, "Belum punya penilaian, sehingga interval monitoring belum diketahui.", true)}
      </ul>
      <p className="mt-4 flex max-w-[68ch] gap-2 text-body text-ink-muted">
        <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span>Jadwal belum valid: {formatAngka(futureMon)} dari {rows.length} aset mencatat &quot;tanggal monitoring terakhir&quot; di masa depan ({stats.futureMonDates.map((d) => formatTanggal(d)).join(", ")}, setelah hari ini). Jadwal dihitung dari tanggal penilaian, bukan dari kolom itu, dan diisi setelah penilaian ada.</span>
      </p>
    </div>
  );
}
