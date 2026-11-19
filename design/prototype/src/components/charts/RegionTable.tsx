import { rows, totalValue, type Row } from "@/lib/data";
import { formatAngka, formatPersen, formatRupiahEksak, formatRupiahRingkas } from "@/lib/format";
import { href } from "@/lib/router";

const regions = ["DKI JAKARTA", "JAWA BARAT", "BANTEN"];
const types: Row["type"][] = ["Bangunan", "Tanah"];
const title = (s: string) => (s === "DKI JAKARTA" ? "DKI Jakarta" : s.toLowerCase().replace(/\b\p{L}/gu, (c) => c.toUpperCase()));

function Bar({ frac, idleFrac, label }: { frac: number; idleFrac: number; label: string }) {
  return (
    <div role="img" aria-label={label} className="h-1.5 w-full max-w-28 bg-surface-sunken">
      <div className="flex h-full" style={{ width: `${Math.max(frac * 100, 1.5)}%` }}>
        <div className="h-full bg-ink-muted" style={{ width: `${(1 - idleFrac) * 100}%` }} />
        <div className="h-full bg-ink" style={{ width: `${idleFrac * 100}%` }} />
      </div>
    </div>
  );
}

export function RegionTable() {
  const groups = regions.flatMap((reg) => types.map((t) => ({ reg, t, rs: rows.filter((r) => r.region === reg && r.type === t) }))).filter((g) => g.rs.length);
  const maxN = Math.max(...groups.map((g) => g.rs.length));
  const maxV = Math.max(...groups.map((g) => g.rs.reduce((s, r) => s + (r.value ?? 0), 0)));
  const idleOf = (rs: Row[]) => rs.filter((r) => r.utilization === "Idle/Kosong");
  const sum = (rs: Row[]) => rs.reduce((s, r) => s + (r.value ?? 0), 0);
  const line = (key: string, reg: string | null, t: string | null, rs: Row[], strong = false) => {
    const idle = idleOf(rs), v = sum(rs), iv = sum(idle);
    const q = { wilayah: reg ?? undefined, jenis: t ?? undefined };
    return (
      <tr key={key} className={`border-b ${strong ? "border-rule-strong bg-surface-sunken font-medium" : "border-rule"}`}>
        <th scope="row" className="h-12 px-3 text-left font-normal">
          <a className="link" href={href("/aset", q)}>{reg ? title(reg) : "Semua wilayah"}{t ? ` · ${t}` : ""}</a>
        </th>
        <td className="px-3 text-right">
          <div className="flex flex-col items-end gap-1"><span className="tabular-nums">{formatAngka(rs.length)}</span>
            <Bar frac={rs.length / (strong ? rs.length : maxN)} idleFrac={rs.length ? idle.length / rs.length : 0} label={`${rs.length} aset, ${idle.length} idle`} /></div>
        </td>
        <td className="px-3 text-right">
          <div className="flex flex-col items-end gap-1"><span title={formatRupiahEksak(v)} className="tabular-nums">{formatRupiahRingkas(v)}</span>
            <Bar frac={v / (strong ? v : maxV)} idleFrac={v ? iv / v : 0} label={`Nilai ${formatRupiahEksak(v)}, idle ${formatRupiahEksak(iv)}`} /></div>
        </td>
        <td className="px-3 text-right tabular-nums">{iv ? <a className="link" href={href("/aset", { ...q, pakai: "idle" })}>{formatRupiahRingkas(iv)} <span className="text-ink-subtle">({formatPersen(iv / v)})</span></a> : <span className="text-ink-subtle">—</span>}</td>
      </tr>
    );
  };
  return (
    <div>
      <ul className="border-t border-rule sm:hidden" aria-label="Wilayah dan jenis">
        {[...groups.map((g) => ({ k: g.reg + g.t, reg: g.reg as string | null, t: g.t as string | null, rs: g.rs })), { k: "total", reg: null, t: null, rs: rows }].map((g) => {
          const idle = idleOf(g.rs), v = sum(g.rs), iv = sum(idle);
          const q = { wilayah: g.reg ?? undefined, jenis: g.t ?? undefined };
          return (
            <li key={g.k} className={`border-b py-3 ${g.k === "total" ? "border-rule-strong bg-surface-sunken px-2 font-medium" : "border-rule"}`}>
              <a className="link" href={href("/aset", q)}>{g.reg ? title(g.reg) : "Semua wilayah"}{g.t ? ` · ${g.t}` : ""}</a>
              <dl className="mt-1 grid grid-cols-3 gap-2 text-body">
                <div><dt className="text-label text-ink-muted">Aset</dt><dd className="tabular-nums">{formatAngka(g.rs.length)}</dd></div>
                <div><dt className="text-label text-ink-muted">Nilai buku</dt><dd className="tabular-nums">{formatRupiahRingkas(v)}</dd></div>
                <div><dt className="text-label text-ink-muted">Idle</dt><dd className="tabular-nums">{iv ? <a className="link" href={href("/aset", { ...q, pakai: "idle" })}>{formatRupiahRingkas(iv)}</a> : "—"}</dd></div>
              </dl>
            </li>
          );
        })}
      </ul>
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[560px] border-collapse text-body">
          <thead><tr className="border-b border-rule-strong bg-surface-sunken">
            <th scope="col" className="h-10 px-3 text-left text-label font-medium">Wilayah · jenis</th>
            <th scope="col" className="px-3 text-right text-label font-medium">Aset</th>
            <th scope="col" className="px-3 text-right text-label font-medium">Nilai buku</th>
            <th scope="col" className="px-3 text-right text-label font-medium">Idle (Rp, % nilai)</th>
          </tr></thead>
          <tbody>
            {groups.map((g) => line(g.reg + g.t, g.reg, g.t, g.rs))}
            {line("total", null, null, rows, true)}
          </tbody>
        </table>
      </div>
      <p className="mt-2 flex flex-wrap items-center gap-x-4 text-label text-ink-subtle">
        <span className="inline-flex items-center gap-1.5"><span className="inline-block h-1.5 w-4 bg-ink-muted" />Terpakai</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block h-1.5 w-4 bg-ink" />Idle (segmen gelap)</span>
        <span>Total nilai {formatRupiahRingkas(totalValue)}, placeholder tidak dihitung.</span>
      </p>
    </div>
  );
}
