import Link from "next/link";
import { isIdle, sumValue } from "@/lib/aggregate";
import { formatAngka, formatPersen, formatRupiahEksak, formatRupiahRingkas } from "@/lib/format";
import { asetList } from "@/lib/routes";
import type { AssetRow } from "@/lib/types";

const TYPES: AssetRow["type"][] = ["Bangunan", "Tanah"];
const title = (s: string) =>
  s === "DKI JAKARTA"
    ? "DKI Jakarta"
    : s.toLowerCase().replace(/\b\p{L}/gu, (c) => c.toUpperCase());

function Meter({ frac, idleFrac, label }: { frac: number; idleFrac: number; label: string }) {
  return (
    <div role="img" aria-label={label} className="h-1.5 w-full max-w-28 bg-surface-sunken">
      <div className="flex h-full" style={{ width: `${Math.max(frac * 100, 1.5)}%` }}>
        <div className="h-full bg-ink-muted" style={{ width: `${(1 - idleFrac) * 100}%` }} />
        <div className="h-full bg-ink" style={{ width: `${idleFrac * 100}%` }} />
      </div>
    </div>
  );
}

interface Group {
  k: string;
  reg: string | null;
  t: string | null;
  rs: AssetRow[];
}

export function RegionTable({ rows, regions }: { rows: AssetRow[]; regions?: string[] }) {
  const regionList = regions ?? [...new Set(rows.map((r) => r.region))].sort();
  const groups: Group[] = regionList
    .flatMap((reg) =>
      TYPES.map((t) => ({
        k: reg + t,
        reg,
        t,
        rs: rows.filter((r) => r.region === reg && r.type === t),
      })),
    )
    .filter((g) => g.rs.length);
  const all: Group = { k: "total", reg: null, t: null, rs: rows };
  const maxN = Math.max(1, ...groups.map((g) => g.rs.length));
  const maxV = Math.max(1, ...groups.map((g) => sumValue(g.rs)));
  const label = (g: Group) => `${g.reg ? title(g.reg) : "Semua wilayah"}${g.t ? ` · ${g.t}` : ""}`;
  const q = (g: Group) => ({ wilayah: g.reg ?? undefined, jenis: g.t ?? undefined });

  const line = (g: Group, strong = false) => {
    const idle = g.rs.filter(isIdle),
      v = sumValue(g.rs),
      iv = sumValue(idle);
    return (
      <tr
        key={g.k}
        className={`border-b ${strong ? "border-rule-strong bg-surface-sunken font-medium" : "border-rule"}`}
      >
        <th scope="row" className="h-12 px-3 text-left font-normal">
          <Link className="link" href={asetList(q(g))}>
            {label(g)}
          </Link>
        </th>
        <td className="px-3 text-right">
          <div className="flex flex-col items-end gap-1">
            <span className="tabular-nums">{formatAngka(g.rs.length)}</span>
            <Meter
              frac={g.rs.length / (strong ? g.rs.length || 1 : maxN)}
              idleFrac={g.rs.length ? idle.length / g.rs.length : 0}
              label={`${g.rs.length} aset, ${idle.length} idle`}
            />
          </div>
        </td>
        <td className="px-3 text-right">
          <div className="flex flex-col items-end gap-1">
            <span title={formatRupiahEksak(v)} className="tabular-nums">
              {formatRupiahRingkas(v)}
            </span>
            <Meter
              frac={v / (strong ? v || 1 : maxV)}
              idleFrac={v ? iv / v : 0}
              label={`Nilai ${formatRupiahEksak(v)}, idle ${formatRupiahEksak(iv)}`}
            />
          </div>
        </td>
        <td className="px-3 text-right tabular-nums">
          {iv ? (
            <Link className="link" href={asetList({ ...q(g), pakai: "idle" })}>
              {formatRupiahRingkas(iv)}{" "}
              <span className="text-ink-subtle">({formatPersen(iv / v)})</span>
            </Link>
          ) : (
            <span className="text-ink-subtle">—</span>
          )}
        </td>
      </tr>
    );
  };

  return (
    <div>
      <ul className="border-t border-rule sm:hidden" aria-label="Wilayah dan jenis">
        {[...groups, all].map((g) => {
          const iv = sumValue(g.rs.filter(isIdle)),
            v = sumValue(g.rs);
          return (
            <li
              key={g.k}
              className={`border-b py-3 ${g.k === "total" ? "border-rule-strong bg-surface-sunken px-2 font-medium" : "border-rule"}`}
            >
              <Link className="link" href={asetList(q(g))}>
                {label(g)}
              </Link>
              <dl className="mt-1 grid grid-cols-3 gap-2 text-body">
                <div>
                  <dt className="text-label text-ink-muted">Aset</dt>
                  <dd className="tabular-nums">{formatAngka(g.rs.length)}</dd>
                </div>
                <div>
                  <dt className="text-label text-ink-muted">Nilai buku</dt>
                  <dd className="tabular-nums">{formatRupiahRingkas(v)}</dd>
                </div>
                <div>
                  <dt className="text-label text-ink-muted">Idle</dt>
                  <dd className="tabular-nums">
                    {iv ? (
                      <Link className="link" href={asetList({ ...q(g), pakai: "idle" })}>
                        {formatRupiahRingkas(iv)}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
              </dl>
            </li>
          );
        })}
      </ul>
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[560px] border-collapse text-body">
          <thead>
            <tr className="border-b border-rule-strong bg-surface-sunken">
              <th scope="col" className="h-10 px-3 text-left text-label font-medium">
                Wilayah · jenis
              </th>
              <th scope="col" className="px-3 text-right text-label font-medium">
                Aset
              </th>
              <th scope="col" className="px-3 text-right text-label font-medium">
                Nilai buku
              </th>
              <th scope="col" className="px-3 text-right text-label font-medium">
                Idle (Rp, % nilai)
              </th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => line(g))}
            {line(all, true)}
          </tbody>
        </table>
      </div>
      <p className="mt-2 flex flex-wrap items-center gap-x-4 text-label text-ink-subtle">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-4 bg-ink-muted" />
          Terpakai
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-4 bg-ink" />
          Idle (segmen gelap)
        </span>
        <span>Total nilai {formatRupiahRingkas(sumValue(rows))}, placeholder tidak dihitung.</span>
      </p>
    </div>
  );
}
