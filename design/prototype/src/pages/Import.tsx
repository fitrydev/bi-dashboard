import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, ShieldAlert, XCircle } from "lucide-react";
import { Button, PageHeader } from "@/components/ui/primitives";
import { rows, stats, type Row } from "@/lib/data";
import { formatAngka } from "@/lib/format";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type St = "ok" | "warning" | "finding" | "error";
type Diff = "baru" | "berubah" | "sama";
interface V { r: Row; st: St; msgs: string[]; diff: Diff }

function validate(r: Row, reimport: boolean): V {
  const msgs: string[] = []; let st: St = "ok";
  // "error" (Ditolak) hanya untuk format/ID/wajib kosong
  if (!/^\d+$/.test(r.code) || !r.name?.trim() || !r.region || !r.type) { st = "error"; msgs.push("Format, ID, atau kolom wajib tidak valid"); }
  if (r.flags.right_expired) { if (st !== "error") st = "finding"; msgs.push("Hak tanah sudah lewat masa berlaku"); }
  if (r.flags.value_placeholder) { if (st === "ok") st = "warning"; msgs.push("Nilai buku placeholder Rp1, dikecualikan dari agregat"); }
  if (r.flags.area_placeholder) { if (st === "ok") st = "warning"; msgs.push("Luas placeholder 1 m²"); }
  if (r.utilization_needs_review) { if (st === "ok") st = "warning"; msgs.push("\"Produktif\" dipetakan ke \"Digunakan sendiri\", perlu review"); }
  if (r.flags.right_expiring_12m) { if (st !== "error") st = "finding"; msgs.push("Hak berakhir kurang dari 12 bulan"); }
  const diff: Diff = !reimport ? "baru" : r.flags.right_expired || r.flags.right_expiring_12m ? "berubah" : "sama";
  return { r, st, msgs, diff };
}
const ST: Record<St, { l: string; i: typeof XCircle; c: string }> = {
  ok: { l: "OK", i: CheckCircle2, c: "text-ink-muted" }, warning: { l: "Peringatan data", i: AlertTriangle, c: "text-status-warning" },
  finding: { l: "Temuan risiko", i: ShieldAlert, c: "" }, error: { l: "Ditolak", i: XCircle, c: "text-status-error" },
};

export function Import() {
  const [step, setStep] = useState(1);
  const [re, setRe] = useState(false);
  const [filter, setFilter] = useState<St | "all">("all");
  const toast = useToast();
  const vs = useMemo(() => rows.map((r) => validate(r, re)), [re]);
  const cnt = (s: St) => vs.filter((v) => v.st === s).length;
  const dcnt = (d: Diff) => vs.filter((v) => v.diff === d).length;
  const shown = vs.filter((v) => filter === "all" || v.st === filter);
  const steps = ["Unggah", "Validasi dan pratinjau", "Konfirmasi"];
  return (
    <>
      <PageHeader title="Import dari Excel" sub="Simulasi memakai file asli Template_Matriks_Risiko_Monitoring_Aset_2027.xlsx. Tidak ada data yang dikirim." />
      <ol className="mt-5 flex flex-wrap gap-x-6 gap-y-1 text-body" aria-label="Langkah import">
        {steps.map((s, i) => <li key={s} aria-current={step === i + 1 ? "step" : undefined} className={cn("border-b-2 py-1", step === i + 1 ? "border-ink font-semibold" : "border-transparent text-ink-muted")}><span className="tabular-nums">{i + 1}.</span> {s}</li>)}
      </ol>

      {step === 1 && (
        <section className="mt-8 max-w-2xl">
          <h2 className="text-title">Unggah file Excel</h2>
          <div className="mt-4 flex items-center gap-4 border border-dashed border-rule-strong p-6">
            <FileSpreadsheet size={32} strokeWidth={1.25} aria-hidden="true" />
            <div className="min-w-0"><p className="break-all text-body font-medium">Template_Matriks_Risiko_Monitoring_Aset_2027.xlsx</p><p className="text-label text-ink-subtle">Sheet Register Aset · {rows.length} baris · contoh file asli</p></div>
          </div>
          <fieldset className="mt-5"><legend className="text-label text-ink-muted">Skenario simulasi</legend>
            {[[false, "Impor pertama (semua baris baru)"], [true, "Impor ulang (sebagian baris berubah)"]].map(([v, l]) => (
              <label key={String(v)} className="flex min-h-11 items-center gap-2 text-body"><input type="radio" name="sk" checked={re === v} onChange={() => setRe(v as boolean)} className="size-5 accent-[var(--ink)]" />{l as string}</label>))}
          </fieldset>
          <Button className="mt-4" variant="primary" onClick={() => setStep(2)}>Validasi file</Button>
        </section>
      )}

      {step >= 2 && (
        <section className="mt-8">
          <h2 className="text-title">{step === 2 ? "Hasil validasi" : "Konfirmasi import"}</h2>
          <p className="mt-1 max-w-[68ch] text-body text-ink-muted">{formatAngka(rows.length)} baris dibaca. {cnt("error")} baris ditolak, {cnt("warning")} peringatan data dan {cnt("finding")} temuan risiko tetap diimpor. Tanggal monitoring masa depan ({stats.futureMon} baris) diabaikan, tidak dipakai untuk jadwal.</p>
          <dl className="mt-4 grid grid-cols-2 gap-4 border-y border-rule py-3 md:grid-cols-4 xl:grid-cols-7">
            {([["OK", cnt("ok")], ["Peringatan data", cnt("warning")], ["Temuan risiko", cnt("finding")], ["Ditolak", cnt("error")], ["Baru", dcnt("baru")], ["Berubah", dcnt("berubah")], ["Sama", dcnt("sama")]] as const).map(([k, n]) => <div key={k}><dt className="text-label text-ink-muted">{k}</dt><dd className="font-serif text-title font-semibold tabular-nums">{formatAngka(n)}</dd></div>)}
          </dl>
          {step === 2 && (<>
            <div role="group" aria-label="Filter status" className="mt-4 flex flex-wrap gap-2">
              {(["all", "ok", "warning", "finding", "error"] as const).map((k) => <button key={k} aria-pressed={filter === k} onClick={() => setFilter(k)} className={cn("min-h-11 cursor-pointer rounded-md border px-3 text-label lg:min-h-9", filter === k ? "border-ink bg-accent text-accent-fg" : "border-rule-strong")}>{k === "all" ? `Semua (${rows.length})` : `${ST[k].l} (${cnt(k)})`}</button>)}
            </div>
            {filter === "error" && cnt("error") === 0 && <p className="mt-3 border border-rule p-4 text-body">Tidak ada baris ditolak. Semua {formatAngka(rows.length)} baris lolos pemeriksaan format, ID, dan kolom wajib.</p>}
            <div className={cn("mt-3 max-h-[480px] overflow-auto border-y border-rule", shown.length === 0 && "hidden")}>
              <table className="w-full min-w-[720px] border-collapse text-body">
                <thead><tr className="border-b border-rule-strong"><th className="sticky top-0 h-10 bg-surface-sunken px-3 text-left text-label font-medium">Baris</th><th className="sticky top-0 bg-surface-sunken px-3 text-left text-label font-medium">Aset</th><th className="sticky top-0 bg-surface-sunken px-3 text-left text-label font-medium">Status</th><th className="sticky top-0 bg-surface-sunken px-3 text-left text-label font-medium">Diff</th><th className="sticky top-0 bg-surface-sunken px-3 text-left text-label font-medium">Catatan</th></tr></thead>
                <tbody>{shown.map((v) => { const S = ST[v.st]; return (
                  <tr key={v.r.code} className="border-b border-rule align-top"><td className="px-3 py-2 tabular-nums">{rows.indexOf(v.r) + 2}</td><td className="px-3 py-2">{v.r.name}<span className="block font-mono text-label text-ink-subtle">{v.r.code}</span></td>
                    <td className="px-3 py-2"><span className={cn("inline-flex items-center gap-1", S.c)} style={v.st === "finding" ? { color: "var(--risk-critical-ink)" } : undefined}><S.i size={14} aria-hidden="true" />{S.l}</span></td><td className="px-3 py-2 capitalize">{v.diff}</td>
                    <td className="px-3 py-2 text-ink-muted">{v.msgs.length ? v.msgs.join("; ") : "—"}</td></tr>); })}</tbody>
              </table>
            </div>
            <div className="mt-4 flex gap-3"><Button onClick={() => setStep(1)}>Kembali</Button><Button variant="primary" onClick={() => setStep(3)}>Lanjut ke konfirmasi</Button></div>
          </>)}
          {step === 3 && (
            <div className="mt-6 max-w-2xl">
              <p className="text-body-lg">Akan mengimpor {dcnt("baru")} aset baru, memperbarui {dcnt("berubah")}, dan melewati {dcnt("sama")} yang sama. {cnt("warning")} baris dengan peringatan data dan {cnt("finding")} temuan risiko (hak kedaluwarsa/berakhir) tetap diimpor dan diberi tanda; {cnt("error")} baris ditolak.</p>
              <div className="mt-4 flex gap-3"><Button onClick={() => setStep(2)}>Kembali</Button><Button variant="primary" onClick={() => { toast("Import disimulasikan. Tidak ada data yang berubah."); setStep(1); }}>Konfirmasi import</Button></div>
            </div>
          )}
        </section>
      )}
    </>
  );
}
