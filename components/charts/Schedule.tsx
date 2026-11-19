import { Info } from "lucide-react";
import { formatAngka, formatTanggal } from "@/lib/format";
import { DEFAULT_PARAMS, dueOf, type ScoringParams } from "@/lib/scoring";
import type { AssetRow } from "@/lib/types";

export function Schedule({
  rows,
  today,
  params = DEFAULT_PARAMS,
}: {
  rows: AssetRow[];
  today: Date;
  params?: ScoringParams;
}) {
  const dues = rows.map(
    (r) => dueOf(r.assessment?.assessed_at ?? null, r.level, params, today).status,
  );
  const count = (s: string) => dues.filter((x) => x === s).length;
  const futureRows = rows.filter((r) => r.flags.monitored_in_future);
  const futureDates = [
    ...new Set(futureRows.map((r) => r.last_monitored_at).filter((d): d is string => !!d)),
  ];
  const line = (label: string, n: number, hint: string, strong?: boolean) => (
    <li className="grid grid-cols-[1fr_auto] items-baseline gap-x-4 border-b border-rule py-2.5">
      <div>
        <span className={strong ? "font-medium" : ""}>{label}</span>
        <span className="block text-label text-ink-subtle">{hint}</span>
      </div>
      <span className="font-serif text-title tabular-nums">{formatAngka(n)}</span>
    </li>
  );
  return (
    <div>
      <ul className="max-w-2xl border-t border-rule">
        {line("Lewat jadwal", count("lewat"), `Jatuh tempo sebelum ${formatTanggal(today)}.`)}
        {line("Jatuh tempo ≤ 30 hari", count("segera"), "Perlu disiapkan bulan ini.")}
        {line("Terjadwal", count("terjadwal"), "Lebih dari 30 hari lagi.")}
        {line(
          "Belum dapat dijadwalkan",
          count("tak-terjadwal"),
          "Belum punya penilaian, sehingga interval monitoring belum diketahui.",
          true,
        )}
      </ul>
      {futureRows.length > 0 && (
        <p className="mt-4 flex max-w-[68ch] gap-2 text-body text-ink-muted">
          <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            Jadwal belum valid: {formatAngka(futureRows.length)} dari {rows.length} aset mencatat
            &quot;tanggal monitoring terakhir&quot; di masa depan (
            {futureDates.map((d) => formatTanggal(d)).join(", ")}, setelah hari ini). Jadwal
            dihitung dari tanggal penilaian, bukan dari kolom itu, dan diisi setelah penilaian ada.
          </span>
        </p>
      )}
    </div>
  );
}
