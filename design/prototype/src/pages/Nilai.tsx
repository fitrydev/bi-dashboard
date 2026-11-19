import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import { Button, LinkButton, PageHeader } from "@/components/ui/primitives";
import { RiskBadge } from "@/components/risk/RiskBadge";
import { ScoreBar } from "@/components/risk/ScoreBar";
import { byValueDesc, criteria, INDICATORS, rowByCode, type IndicatorKey } from "@/lib/data";
import { formatRupiahRingkas, formatSkor } from "@/lib/format";
import { categoryFor, categoryInfo, computeScore, intervalText } from "@/lib/scoring";
import { href } from "@/lib/router";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

const LEVEL_TEXT = ["Risiko sangat rendah", "Risiko rendah", "Risiko sedang", "Risiko tinggi", "Risiko sangat tinggi"];

export function Nilai({ code }: { code?: string }) {
  if (!code) return <Picker />;
  const r = rowByCode.get(code);
  if (!r) return <Picker />;
  return <Form key={code} code={code} />;
}

function Picker() {
  const list = byValueDesc.filter((r) => !r.assessment).slice(0, 12);
  return (
    <>
      <PageHeader title="Input penilaian" sub="Pilih aset yang akan dinilai. Daftar diurutkan dari nilai buku tertinggi yang belum dinilai." />
      <ul className="mt-6 border-t border-rule max-w-3xl">
        {list.map((r, i) => (
          <li key={r.code} className="border-b border-rule"><a href={href(`/nilai/${r.code}`)} className="tab-t grid min-h-14 grid-cols-[2rem_1fr_auto] items-center gap-2 px-1 hover:bg-surface-sunken"><span className="text-label text-ink-subtle tabular-nums">{i + 1}</span><span>{r.name}<span className="block font-mono text-label text-ink-subtle">{r.code}</span></span><span className="tabular-nums">{formatRupiahRingkas(r.value)}</span></a></li>
        ))}
      </ul>
    </>
  );
}

function Form({ code }: { code: string }) {
  const r = rowByCode.get(code)!;
  const toast = useToast();
  const init = r.assessment?.scores;
  const [sc, setSc] = useState<Partial<Record<IndicatorKey, number | "?">>>(() => init ? { ...init } as Record<IndicatorKey, number> : {});
  const [override, setOverride] = useState(false);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [tried, setTried] = useState(false);
  const [focusTick, setFocusTick] = useState(0);
  useEffect(() => {
    if (!focusTick) return;
    const el = document.getElementById("ringkasan-error");
    if (!el) return;
    el.focus({ preventScroll: true });
    el.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [focusTick]);

  const numeric = Object.fromEntries(INDICATORS.map((i) => [i.key, typeof sc[i.key] === "number" ? (sc[i.key] as number) : null])) as Record<IndicatorKey, number | null>;
  const unfilled = INDICATORS.filter((i) => sc[i.key] == null);
  const unknown = INDICATORS.filter((i) => sc[i.key] === "?");
  const score = computeScore(numeric);
  const level = categoryFor(score, override);
  const needNote = override || Object.values(numeric).some((v) => v != null && v >= 4);
  const errs: string[] = [];
  if (unfilled.length) errs.push(`Pilih skor untuk ${unfilled.map((i) => i.label).join(", ")}.`);
  if (override && !reason.trim()) errs.push("Isi alasan override Critical.");
  if (needNote && !note.trim()) errs.push("Isi catatan untuk skor 4 atau 5.");
  const complete = unknown.length === 0 && unfilled.length === 0;
  const info = categoryInfo(level);

  const save = (draft: boolean) => {
    if (!draft) { setTried(true); if (errs.length) { setFocusTick((t) => t + 1); return; } }
    toast(draft ? "Draf disimpan (prototipe, belum tersimpan ke server)." : `Penilaian ${r.name} disimpan (prototipe): skor ${score == null ? "belum lengkap" : formatSkor(score)}.`);
  };

  const Preview = (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="hidden text-label text-ink-muted sm:inline lg:inline">Pratinjau skor</span>
        <span aria-live="polite" className="flex items-center gap-2">
          <span className="font-serif text-body-lg font-semibold tabular-nums lg:text-title">{score == null ? "—" : formatSkor(score)}</span>
          <RiskBadge level={level} override={override} />
          {score == null && !override && <span className="text-label text-ink-subtle">Lengkapi {INDICATORS.length} indikator</span>}
        </span>
      </div>
      <div className="mt-1"><ScoreBar score={score} level={level} compact /></div>
      <p className="mt-1 text-label text-ink-subtle">{info ? `Interval pemantauan: ${intervalText(level)}.` : unknown.length ? `${unknown.length} indikator belum diketahui, skor belum dihitung.` : `${unfilled.length} indikator belum diisi.`}</p>
    </div>
  );

  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-3 text-label text-ink-muted"><a className="link" href="#/aset">Aset</a> / <a className="link" href={href(`/aset/${code}`)}>{r.name}</a> / <span className="text-ink">Penilaian</span></nav>
      <PageHeader title={`Nilai ${r.name}`} sub={<>ID <span className="font-mono">{code}</span> · {formatRupiahRingkas(r.value)}. Skala: <strong>1 = risiko sangat rendah … 5 = risiko sangat tinggi</strong>.</>} />
      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <form noValidate onSubmit={(e) => { e.preventDefault(); save(false); }} className="min-w-0 pb-40 lg:pb-0">
          {tried && errs.length > 0 && (
            <div id="ringkasan-error" tabIndex={-1} role="alert" className="mb-6 border border-status-error p-4">
              <p className="flex items-center gap-2 text-label font-medium text-status-error"><AlertCircle size={16} aria-hidden="true" />Penilaian belum bisa disimpan</p>
              <ul className="mt-2 list-disc pl-5 text-body">{errs.map((e) => <li key={e}>{e}</li>)}</ul>
            </div>
          )}
          {INDICATORS.map((ind, idx) => {
            const val = sc[ind.key];
            const noteHere = idx === INDICATORS.length - 1;
            return (
              <fieldset key={ind.key} className="mb-10 min-w-0 border-0 p-0">
                <legend className="mb-1 text-body-lg font-semibold">{idx + 1}. {ind.label} <span className="text-label font-normal text-ink-muted">· bobot {Math.round(ind.weight * 100)}%</span></legend>
                <p className="mb-3 text-label text-ink-subtle">1 = risiko sangat rendah · 5 = risiko sangat tinggi</p>
                {tried && val == null && <p className="mb-2 text-label text-status-error" role="alert">Pilih salah satu skor untuk indikator ini.</p>}
                <div className="flex flex-col gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <label key={n} className={cn("tab-t flex min-h-14 w-full cursor-pointer items-start gap-3 rounded-md border px-3 py-3", val === n ? "border-ink bg-surface-sunken" : "border-rule hover:bg-surface-sunken")}>
                      <input type="radio" name={ind.key} checked={val === n} onChange={() => setSc({ ...sc, [ind.key]: n })} className="mt-1.5 size-5 shrink-0 accent-[var(--ink)]" />
                      <span className="w-6 shrink-0 text-center font-serif text-subtitle font-semibold tabular-nums leading-tight">{n}</span>
                      <span className="min-w-0"><span className="block text-body font-medium">{LEVEL_TEXT[n - 1]}</span><span className="block text-body text-ink-muted">{criteria[ind.key][String(n)]}</span></span>
                    </label>
                  ))}
                  <label className={cn("flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-md border px-3 py-3", val === "?" ? "hatch-unrated border-ink" : "border-dashed border-rule-strong hover:bg-surface-sunken")}>
                    <input type="radio" name={ind.key} checked={val === "?"} onChange={() => setSc({ ...sc, [ind.key]: "?" })} className="size-5 shrink-0 accent-[var(--ink)]" />
                    <span className="w-6 text-center font-semibold text-ink-muted">?</span>
                    <span className="bg-surface px-1 text-body">Belum diketahui <span className="text-ink-muted">· skor total belum dihitung</span></span>
                  </label>
                </div>
                {noteHere && (
                  <div className="mt-8 space-y-6">
                    <div>
                      <label className="flex min-h-11 items-center gap-2 text-body font-medium"><input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} className="size-5 accent-[var(--ink)]" />Override ke Critical</label>
                      {override && (<><label htmlFor="alasan" className="mt-2 block text-label">Alasan override (wajib)</label>
                        <textarea id="alasan" aria-required="true" aria-invalid={tried && !reason.trim()} value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="mt-1 w-full rounded-md border border-input bg-surface-raised p-3 text-body" />
                        {tried && !reason.trim() && <p className="text-label text-status-error">Isi alasan override Critical.</p>}</>)}
                    </div>
                    <div>
                      <label htmlFor="catatan" className="block text-label font-medium">Catatan temuan {needNote ? "(wajib)" : "(opsional)"}</label>
                      <textarea id="catatan" aria-required={needNote} aria-invalid={tried && needNote && !note.trim()} value={note} onChange={(e) => setNote(e.target.value)} rows={4} className="mt-1 w-full rounded-md border border-input bg-surface-raised p-3 text-body" />
                      {tried && needNote && !note.trim() && <p className="mt-1 text-label text-status-error">Isi catatan untuk skor 4 atau 5.</p>}
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Button type="submit" variant="primary">Simpan penilaian</Button>
                      <Button type="button" onClick={() => save(true)}>Simpan draf</Button>
                      <LinkButton variant="ghost" href={href(`/aset/${code}`)}>Batal</LinkButton>
                    </div>
                    {!complete && <p className="text-label text-ink-subtle">{unknown.length ? "Ada indikator \"Belum diketahui\": penilaian tersimpan sebagai belum lengkap." : ""}</p>}
                  </div>
                )}
              </fieldset>
            );
          })}
        </form>
        <aside className="hidden lg:block"><div className="sticky top-10 border-t-2 border-ink pt-4">{Preview}
          <ul className="mt-4 border-t border-rule text-label">{INDICATORS.map((i) => <li key={i.key} className="flex justify-between border-b border-rule py-1.5"><span>{i.label}</span><span className="tabular-nums">{sc[i.key] == null ? "—" : sc[i.key]}</span></li>)}</ul></div></aside>
      </div>
      <div className="fixed inset-x-0 bottom-14 z-20 border-t border-rule-strong bg-surface-raised px-4 py-2 lg:hidden">{Preview}</div>
    </>
  );
}
