"use client";

import { CheckCircle2, Lock, Pencil } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/ledger/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Section } from "@/components/ledger/Section";
import { Tag } from "@/components/ledger/Tag";
import {
  activateParamsVersion,
  applyRecalc,
  createParamsDraft,
  deleteParamsDraft,
  previewParamsImpact,
  previewRecalc,
  updateParamsDraft,
} from "@/lib/actions/settings";
import { formatAngka, formatTanggal } from "@/lib/format";
import { CATEGORIES, fractionToPct, INDICATORS, paramsInput, type ParamsFormInput } from "@/lib/schemas/settings";
import { SHORT_LABEL } from "@/lib/scoring";
import type { Impact, ParamsVersion } from "@/lib/settings/types";
import { href } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { Busy, Confirm, Field, ImpactView } from "./ui";

const CAT_LABEL = { critical: "Critical", high: "High", medium: "Medium", low: "Low" } as const;
const THR = ["critical", "high", "medium"] as const;

type Form = { w: Record<string, string>; t: Record<string, string>; i: Record<string, string> };
const pctStr = (f: number) => String(fractionToPct(f)).replace(".", ",");
const toForm = (v: ParamsVersion): Form => ({
  w: Object.fromEntries(INDICATORS.map((k) => [k, pctStr(v.weights[k] ?? 0)])),
  t: Object.fromEntries(THR.map((k) => [k, String(v.thresholds[k])])),
  i: Object.fromEntries(CATEGORIES.map((k) => [k, String(v.intervals[k])])),
});
const toInput = (f: Form) => ({ weights: f.w, thresholds: f.t, intervals: f.i }) as ParamsFormInput;

export function ParameterTab({ versions, selected }: { versions: ParamsVersion[]; selected: number | null }) {
  const active = versions.find((v) => v.is_active);
  const cur = versions.find((v) => v.version === selected) ?? active ?? versions[0];
  const router = useRouter();
  const [pending, start] = useTransition();
  const [dirty, setDirty] = useState(false);

  if (!cur || !active)
    return <EmptyState purpose="Belum ada parameter skor." why="Seed database belum berjalan, jadi tidak ada versi yang bisa ditampilkan." />;

  const newDraft = () =>
    start(async () => {
      const r = await createParamsDraft();
      if (!r.ok) return void toast.error(r.error);
      toast.success(`Draf versi ${r.data.version} dibuat dari versi ${active.version}`);
      router.push(href("/pengaturan", { tab: "parameter", versi: r.data.version }));
    });

  return (
    <div className="space-y-2">
      <Section
        first
        id="versi"
        title="Versi parameter"
        sub="Versi aktif dipakai untuk penilaian baru. Versi yang pernah aktif atau dipakai penilaian terkunci; ubah lewat draf baru."
        action={
          <Busy type="button" pending={pending} onClick={newDraft}>
            Buat draf dari versi aktif
          </Busy>
        }
      >
        <ul className="divide-y divide-rule border-y border-rule" aria-label="Versi parameter" data-testid="version-list">
          {versions.map((v) => (
            <li key={v.version}>
              <Link
                href={href("/pengaturan", { tab: "parameter", versi: v.version })}
                aria-current={v.version === cur.version ? "true" : undefined}
                data-testid={`version-${v.version}`}
                className={cn(
                  "flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 px-1 py-2 hover:bg-surface-sunken",
                  v.version === cur.version && "bg-surface-sunken",
                )}
              >
                <span className={cn("text-body text-ink", v.version === cur.version && "font-semibold")}>Versi {v.version}</span>
                <StatusTag v={v} />
                <span className="ml-auto text-caption text-ink-muted">
                  {v.activated_at ? `Aktif sejak ${formatTanggal(v.activated_at)}` : `Dibuat ${formatTanggal(v.created_at)}`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="detail" title={`Versi ${cur.version}`} tag={cur.is_active ? <StatusTag v={cur} /> : undefined} sub={cur.notes ?? undefined}>
        {cur.locked ? <ReadOnly v={cur} /> : <DraftEditor key={cur.version} v={cur} active={active} onDirty={setDirty} />}
        {!cur.is_active && <Activate key={`${cur.version}:${JSON.stringify([cur.weights, cur.thresholds, cur.intervals])}`} v={cur} active={active} dirty={!cur.locked && dirty} />}
      </Section>

      <Section
        id="recalc"
        title="Hitung ulang dengan versi aktif"
        sub={`Penilaian terakhir tiap aset yang masih memakai versi lain dihitung ulang dengan versi ${active.version}. Riwayat penilaian lama tidak diubah.`}
      >
        <Recalc activeVersion={active.version} />
      </Section>
    </div>
  );
}

function StatusTag({ v }: { v: ParamsVersion }) {
  return v.is_active ? (
    <Tag>
      <CheckCircle2 className="size-3" aria-hidden="true" />
      Aktif
    </Tag>
  ) : v.locked ? (
    <Tag>
      <Lock className="size-3" aria-hidden="true" />
      Terkunci
    </Tag>
  ) : (
    <Tag>
      <Pencil className="size-3" aria-hidden="true" />
      Draf
    </Tag>
  );
}

function ReadOnly({ v }: { v: ParamsVersion }) {
  return (
    <div className="space-y-5">
      <p className="max-w-[68ch] text-body text-ink-muted">
        {v.is_active ? "Versi aktif tidak dapat diubah." : "Versi ini pernah aktif atau dipakai penilaian, jadi terkunci."} Untuk mengubah angka, buat draf baru.
      </p>
      <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
        <Block title="Bobot indikator">
          {INDICATORS.map((k) => (
            <Row key={k} label={SHORT_LABEL[k]} value={`${pctStr(v.weights[k] ?? 0)}%`} />
          ))}
        </Block>
        <div className="space-y-5">
          <Block title="Ambang kategori (skor ≥)">
            {THR.map((k) => (
              <Row key={k} label={CAT_LABEL[k]} value={String(v.thresholds[k])} />
            ))}
          </Block>
          <Block title="Interval monitoring">
            {CATEGORIES.map((k) => (
              <Row key={k} label={CAT_LABEL[k]} value={`${v.intervals[k]} bulan`} />
            ))}
          </Block>
        </div>
      </div>
    </div>
  );
}
const Block = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <h4 className="mb-1 text-label font-medium text-ink">{title}</h4>
    <dl className="divide-y divide-rule border-y border-rule">{children}</dl>
  </div>
);
const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex min-h-9 items-center justify-between gap-4 py-1">
    <dt className="text-body text-ink-muted">{label}</dt>
    <dd className="text-body tabular-nums text-ink">{value}</dd>
  </div>
);

function DraftEditor({ v, active, onDirty }: { v: ParamsVersion; active: ParamsVersion; onDirty: (d: boolean) => void }) {
  const router = useRouter();
  const saved = useMemo(() => toForm(v), [v]);
  const base = useMemo(() => toForm(active), [active]);
  const [f, setF] = useState<Form>(saved);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const summaryRef = useRef<HTMLParagraphElement>(null);

  const total = INDICATORS.reduce((a, k) => a + Math.round(Number(f.w[k].replace(",", ".")) * 100 || 0), 0) / 100;
  const totalOk = total === 100;
  const dirty = JSON.stringify(f) !== JSON.stringify(saved);
  useEffect(() => {
    onDirty(dirty);
    return () => onDirty(false);
  }, [dirty, onDirty]);
  const set = (g: keyof Form, k: string, val: string) => setF((p) => ({ ...p, [g]: { ...p[g], [k]: val } }));

  const save = () => {
    const p = paramsInput.safeParse(toInput(f));
    if (!p.success) {
      const m: Record<string, string> = {};
      for (const i of p.error.issues) m[i.path.join(".")] ??= i.message;
      setErrs(m);
      return void requestAnimationFrame(() => summaryRef.current?.focus());
    }
    setErrs({});
    start(async () => {
      const r = await updateParamsDraft({ version: v.version, params: toInput(f) });
      if (r.ok) {
        toast.success(`Draf versi ${v.version} disimpan`);
        router.refresh();
      } else {
        setErrs(Object.fromEntries(Object.entries(r.fieldErrors ?? {}).map(([k, m]) => [k, m[0]])));
        requestAnimationFrame(() => summaryRef.current?.focus());
      }
    });
  };
  const del = async () => {
    const r = await deleteParamsDraft({ version: v.version });
    if (r.ok) {
      toast.success(`Draf versi ${v.version} dihapus`);
      router.push(href("/pengaturan", { tab: "parameter" }));
    } else toast.error(r.error);
  };

  const changed = (a: string, b: string) => a.replace(",", ".") !== b.replace(",", ".");
  const nChanged =
    INDICATORS.filter((k) => changed(f.w[k], base.w[k])).length +
    THR.filter((k) => changed(f.t[k], base.t[k])).length +
    CATEGORIES.filter((k) => changed(f.i[k], base.i[k])).length;
  const summary = Object.values(errs)[0];

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      noValidate
      className="space-y-6"
      aria-label={`Edit draf versi ${v.version}`}
    >
      {summary && (
        <p ref={summaryRef} role="alert" className="text-body text-status-error" tabIndex={-1}>
          {summary}
        </p>
      )}
      <fieldset className="space-y-2">
        <legend className="text-label font-medium text-ink">Bobot indikator (%)</legend>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {INDICATORS.map((k) => (
            <Num key={k} id={`w-${k}`} label={SHORT_LABEL[k]} suffix="%" value={f.w[k]} diff={changed(f.w[k], base.w[k]) ? `aktif: ${base.w[k]}%` : undefined} error={errs[`weights.${k}`]} onChange={(x) => set("w", k, x)} />
          ))}
        </div>
        <p aria-live="polite" data-testid="weight-total" className={cn("text-body tabular-nums", totalOk ? "text-ink" : "text-status-error")}>
          Total: {total.toLocaleString("id-ID")}% {totalOk ? "(sesuai)" : `(harus 100%, selisih ${(Math.round((100 - total) * 100) / 100).toLocaleString("id-ID")}%)`}
        </p>
        {errs.weights && <p role="alert" className="text-caption text-status-error">{errs.weights}</p>}
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-label font-medium text-ink">Ambang kategori (skor ≥)</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {THR.map((k) => (
            <Num key={k} id={`t-${k}`} label={CAT_LABEL[k]} value={f.t[k]} diff={changed(f.t[k], base.t[k]) ? `aktif: ${base.t[k]}` : undefined} error={errs[`thresholds.${k}`]} onChange={(x) => set("t", k, x)} />
          ))}
        </div>
        {errs.thresholds && <p role="alert" className="text-caption text-status-error">{errs.thresholds}</p>}
        <p className="text-caption text-ink-muted">Di bawah ambang Medium = Low. Urutan: 100 ≥ Critical &gt; High &gt; Medium &gt; 0.</p>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-label font-medium text-ink">Interval monitoring (bulan)</legend>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map((k) => (
            <Num key={k} id={`i-${k}`} label={CAT_LABEL[k]} suffix="bln" value={f.i[k]} diff={changed(f.i[k], base.i[k]) ? `aktif: ${base.i[k]}` : undefined} error={errs[`intervals.${k}`]} onChange={(x) => set("i", k, x)} />
          ))}
        </div>
      </fieldset>
      {/* ponytail: metode/frekuensi/tindakan per kategori (kolom methods) disalin dari versi aktif dan belum bisa diubah di UI; tambah bila perlu. */}

      <div className="flex flex-wrap items-center gap-3">
        <Busy type="submit" pending={pending} disabled={!dirty}>
          Simpan draf
        </Busy>
        <Confirm
          title={`Hapus draf versi ${v.version}?`}
          body={<p>Draf dan rubriknya dihapus permanen. Versi aktif tidak terpengaruh.</p>}
          confirmLabel="Hapus draf"
          destructive
          onConfirm={del}
          trigger={(open) => (
            <Button type="button" variant="outline" onClick={open}>
              Hapus draf
            </Button>
          )}
        />
        <span className="text-caption text-ink-muted" aria-live="polite">
          {dirty ? "Ada perubahan belum disimpan." : nChanged ? `${nChanged} nilai berbeda dari versi aktif (ditandai).` : "Sama dengan versi aktif."}
        </span>
      </div>
      <p className="text-caption text-ink-muted">
        Rubrik versi ini diedit di tab{" "}
        <Link className="underline underline-offset-2" href={href("/pengaturan", { tab: "rubrik", versi: v.version })}>
          Rubrik
        </Link>
        .
      </p>
    </form>
  );
}

function Num({ id, label, suffix, value, diff, error, onChange }: { id: string; label: string; suffix?: string; value: string; diff?: string; error?: string; onChange: (v: string) => void }) {
  return (
    <Field id={id} label={label} error={error} hint={diff && <span data-testid={`diff-${id}`}>Berubah ({diff})</span>}>
      <div className="flex items-center gap-2">
        <Input id={id} inputMode="decimal" autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={!!error} aria-describedby={[error && `${id}-err`, diff && `${id}-hint`].filter(Boolean).join(" ") || undefined} className={cn("text-base tabular-nums", diff && "border-ink")} />
        {suffix && <span className="text-caption text-ink-muted">{suffix}</span>}
      </div>
    </Field>
  );
}

function Activate({ v, active, dirty }: { v: ParamsVersion; active: ParamsVersion; dirty: boolean }) {
  const router = useRouter();
  const [impact, setImpact] = useState<Impact | null>(null);
  const [err, setErr] = useState<string>();
  const [pending, start] = useTransition();
  const preview = () =>
    start(async () => {
      setErr(undefined);
      const r = await previewParamsImpact({ version: v.version });
      if (r.ok) setImpact(r.data);
      else setErr(r.error);
    });
  const activate = async () => {
    const r = await activateParamsVersion({ version: v.version });
    if (r.ok) {
      toast.success(`Versi ${r.data.version} aktif. Skor lama tidak berubah; gunakan "Hitung ulang" bila perlu.`, { duration: 8000 });
      router.refresh();
    } else toast.error(r.error);
  };
  return (
    <div className="mt-8 space-y-4 border-t border-rule pt-6">
      <h3 className="text-body-lg font-semibold text-ink">Aktifkan versi {v.version}</h3>
      <p className="max-w-[68ch] text-body text-ink-muted">
        Lihat dulu dampaknya pada penilaian terakhir tiap aset bila versi {v.version} dipakai (dibanding skor yang tersimpan sekarang). Pratinjau tidak menyimpan apa pun.
      </p>
      <Busy type="button" variant="outline" pending={pending} disabled={dirty} onClick={preview} data-testid="impact-preview">
        Pratinjau dampak
      </Busy>
      {dirty && <p className="text-caption text-ink-muted">Simpan draf dulu.</p>}
      {err && <p role="alert" className="text-body text-status-error">{err} <button type="button" className="underline" onClick={preview}>Coba lagi</button></p>}
      {impact && !dirty && (
        <>
          <ImpactView level={3} impact={impact} title={`Dampak versi ${v.version}`} />
          <Confirm
            title={`Aktifkan versi ${v.version}?`}
            body={
              <>
                <p>
                  Versi {active.version} dinonaktifkan; penilaian <strong>baru</strong> memakai versi {v.version}. Skor penilaian yang sudah ada <strong>tidak berubah</strong> sampai Anda menjalankan “Hitung ulang”.
                </p>
                <p>Setelah diaktifkan, versi {v.version} terkunci dan tidak bisa diubah atau dihapus.</p>
              </>
            }
            confirmLabel="Aktifkan"
            onConfirm={activate}
            trigger={(open) => (
              <Button type="button" onClick={open} data-testid="activate">
                Aktifkan versi {v.version}
              </Button>
            )}
          />
        </>
      )}
    </div>
  );
}

function Recalc({ activeVersion }: { activeVersion: number }) {
  const router = useRouter();
  const [impact, setImpact] = useState<Impact | null>(null);
  const [err, setErr] = useState<string>();
  const [pending, start] = useTransition();
  const preview = () =>
    start(async () => {
      setErr(undefined);
      const r = await previewRecalc();
      if (r.ok) setImpact(r.data);
      else setErr(r.error);
    });
  const apply = async () => {
    const r = await applyRecalc();
    if (r.ok) {
      toast.success(`${formatAngka(r.data.updated)} penilaian dihitung ulang dengan versi ${activeVersion}`);
      setImpact(null);
      router.refresh();
    } else toast.error(r.error);
  };
  return (
    <div className="space-y-4">
      <Busy type="button" variant="outline" pending={pending} onClick={preview} data-testid="recalc-preview">
        Pratinjau hitung ulang
      </Busy>
      {err && <p role="alert" className="text-body text-status-error">{err}</p>}
      {impact &&
        (impact.assessments_total === 0 ? (
          <p className="text-body text-ink-muted" data-testid="recalc-none">
            Semua penilaian terakhir sudah memakai versi {activeVersion}. Tidak ada yang perlu dihitung ulang.
          </p>
        ) : (
          <>
            <ImpactView level={3} impact={impact} title={`Dampak hitung ulang ke versi ${activeVersion}`} />
            <Confirm
              title="Terapkan hitung ulang?"
              body={<p>{formatAngka(impact.assessments_total)} penilaian terakhir akan dicatat memakai versi {activeVersion}. Dashboard, kategori, dan jadwal ikut berubah. Tindakan ini tercatat di audit.</p>}
              confirmLabel="Terapkan hitung ulang"
              onConfirm={apply}
              trigger={(open) => (
                <Button type="button" onClick={open} data-testid="recalc-apply">
                  Terapkan hitung ulang
                </Button>
              )}
            />
          </>
        ))}
    </div>
  );
}
