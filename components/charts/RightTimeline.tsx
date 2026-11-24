"use client";

import Link from "next/link";
import { useId, useMemo } from "react";
import { RiskMarker } from "@/components/risk/RiskMarker";
import { ChartFrame } from "@/components/ledger/ChartFrame";
import { LedgerTable } from "@/components/ledger/LedgerTable";
import { Tip } from "@/components/ledger/Tip";
import { formatAngka, formatTanggal } from "@/lib/format";
import { asetDetail } from "@/lib/routes";
import type { AssetRow } from "@/lib/types";

const Y0 = 2020,
  Y1 = 2052; // rentang linear; sebelum Y0 dijepit ke zona patah di kiri
const PRE = 10; // lebar zona "sebelum 2020" (% dari area plot)
const STEP = 24; // jarak vertikal titik sewarna tahun
const H = 220,
  AXIS = 30;

export function RightTimeline({ rows, today }: { rows: AssetRow[]; today: Date }) {
  const descId = useId();
  const lands = useMemo(
    () =>
      rows
        .filter((r) => r.type === "Tanah" && r.right_expiry_date)
        .sort((a, b) => a.right_expiry_date!.localeCompare(b.right_expiry_date!)),
    [rows],
  );
  const t0 = Date.UTC(Y0, 0, 1),
    t1 = Date.UTC(Y1, 0, 1);
  const pos = (t: number) => (t < t0 ? PRE / 2 : PRE + ((t - t0) / (t1 - t0)) * (100 - PRE));
  const now = pos(today.getTime());
  const in12 = pos(today.getTime() + 365 * 86400000);
  const expired = lands.filter((r) => r.flags.right_expired);
  const expiringN = rows.filter((r) => r.flags.right_expiring_12m).length;
  const noDate = rows.filter((r) => r.type === "Tanah" && !r.right_expiry_date).length;
  const bangunanN = rows.filter((r) => r.type === "Bangunan").length;
  const groups = useMemo(() => {
    const m = new Map<number, AssetRow[]>();
    lands.forEach((r) => {
      const y = new Date(r.right_expiry_date!).getUTCFullYear();
      m.set(y, [...(m.get(y) ?? []), r]);
    });
    const p = (t: number) => (t < t0 ? PRE / 2 : PRE + ((t - t0) / (t1 - t0)) * (100 - PRE));
    return [...m.entries()].map(([y, rs]) => ({
      y,
      rs,
      x: p(new Date(rs[0].right_expiry_date!).getTime()),
    }));
  }, [lands, t0, t1]);
  const summary = `Masa berlaku hak ${formatAngka(lands.length)} aset tanah. ${formatAngka(expired.length)} sudah lewat${expired.length ? ` (${expired.map((r) => `${r.name}, ${formatTanggal(r.right_expiry_date)}`).join("; ")})` : ""}, ${formatAngka(expiringN)} berakhir kurang dari 12 bulan, sisanya masih berlaku${groups.length ? `; hak terjauh berakhir ${Math.max(...groups.map((g) => g.y))}` : ""}.`;
  const table = (
    <LedgerTable
      caption="Masa berlaku hak per aset tanah"
      head={["Aset", "Berakhir", "Status"]}
      rows={lands.map((r) => [
        <Link key={r.code} className="link" href={asetDetail(r.code)}>
          {r.name}
        </Link>,
        formatTanggal(r.right_expiry_date),
        r.flags.right_expired
          ? "Sudah lewat"
          : r.flags.right_expiring_12m
            ? "< 12 bulan"
            : "Masih berlaku",
      ])}
    />
  );
  const ticks = Array.from({ length: (Y1 - Y0) / 4 + 1 }, (_, i) => Y0 + i * 4);
  const chart = (
    <div
      role="region"
      aria-label="Linimasa masa berlaku hak, dapat digulir"
      tabIndex={0}
      className="overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <div
        className="relative min-w-[680px]"
        style={{ height: H }}
        role="group"
        aria-label={`Masa berlaku hak ${lands.length} aset tanah`}
        aria-describedby={descId}
      >
        <div className="absolute inset-y-0 right-6 left-6">
          <div
            className="absolute inset-y-0 bg-risk-critical-tint"
            style={{ left: 0, width: `${now}%` }}
          />
          <div
            className="absolute inset-y-0 bg-risk-high-tint"
            style={{ left: `${now}%`, width: `${in12 - now}%` }}
          />
          <div
            className="absolute inset-y-0 border-l border-dashed border-rule-strong"
            style={{ left: `${PRE}%` }}
          />
          <span
            className="absolute text-label font-medium text-risk-critical-ink"
            style={{ top: 22, right: `calc(${100 - now}% + 6px)` }}
          >
            Sudah lewat
          </span>
          <span
            className="absolute text-label font-medium text-risk-high-ink"
            style={{ top: 22, left: `calc(${now}% + 6px)` }}
          >
            &lt; 12 bulan
          </span>
          <div className="absolute inset-y-0 w-px bg-ink" style={{ left: `${now}%` }} />
          <span
            className="absolute top-0 -translate-x-1/2 bg-surface px-1 text-label font-semibold whitespace-nowrap text-ink"
            style={{ left: `${now}%` }}
          >
            Hari ini
          </span>
          <div className="absolute inset-x-0 h-px bg-rule-strong" style={{ bottom: AXIS }} />
          <span
            className="absolute -translate-x-1/2 text-label whitespace-nowrap text-ink-muted"
            style={{ left: `${PRE / 2}%`, bottom: 0 }}
          >
            Sebelum {Y0}
          </span>
          {ticks
            .filter((y) => y > Y0)
            .map((y) => (
              <span
                key={y}
                className="absolute bottom-0 -translate-x-1/2 text-label text-ink-muted tabular-nums"
                style={{ left: `${pos(Date.UTC(y, 0, 1))}%` }}
              >
                {y}
              </span>
            ))}
          {groups.map((g) => (
            <div
              key={g.y}
              className="absolute -translate-x-1/2"
              style={{ left: `${g.x}%`, bottom: AXIS + 2 }}
            >
              <ul className="flex flex-col-reverse items-center">
                {g.rs.map((r) => {
                  const exp = r.flags.right_expired,
                    soon = r.flags.right_expiring_12m;
                  return (
                    <li key={r.code} style={{ height: STEP }} className="flex items-center">
                      <Tip
                        tip={
                          <>
                            <div className="font-medium">{r.name}</div>
                            <div className="tabular-nums">
                              Berakhir {formatTanggal(r.right_expiry_date)}
                            </div>
                            <div className="underline">Lihat aset</div>
                          </>
                        }
                      >
                        <Link
                          href={asetDetail(r.code)}
                          aria-label={`${r.name}, hak berakhir ${formatTanggal(r.right_expiry_date)}${exp ? ", sudah lewat" : soon ? ", kurang dari 12 bulan" : ""}`}
                          data-hak={exp ? "lewat" : soon ? "segera" : "aman"}
                          className="flex size-6 items-center justify-center"
                        >
                          {exp ? (
                            <RiskMarker level="critical" size={16} />
                          ) : soon ? (
                            <RiskMarker level="high" size={14} />
                          ) : (
                            <span className="block size-2.5 rounded-full border-[1.5px] border-surface bg-ink" />
                          )}
                        </Link>
                      </Tip>
                    </li>
                  );
                })}
              </ul>
              {g.rs.length > 1 && (
                <span
                  className="absolute top-0 left-full ml-0.5 text-label font-medium whitespace-nowrap text-ink tabular-nums"
                  aria-hidden="true"
                >
                  ×{g.rs.length}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
  return (
    <div>
      <ChartFrame id="masa-hak" chart={chart} table={table} />
      <p id={descId} className="mt-2 max-w-[80ch] text-label text-ink-subtle">
        {summary} {noDate > 0 && `${formatAngka(noDate)} tanah belum punya tanggal. `}Bangunan (
        {formatAngka(bangunanN)} aset) tidak memuat tanggal hak. Satu tahun dengan beberapa aset
        ditumpuk dan diberi tanda ×jumlah.
      </p>
    </div>
  );
}
