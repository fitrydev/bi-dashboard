"use client";

import { Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type ReactNode } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { RiskBadge, ScoreBar, type Rubric } from "@/components/risk";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { discardAssessmentDraft, saveAssessment, saveAssessmentDraft } from "@/lib/actions/assessments";
import {
  fieldId,
  findingsRequired,
  issuesToFieldErrors,
  mapFieldErrors,
  toPayload,
  type DefaultSource,
  type FormValues,
} from "@/lib/assessments/form";
import { formatSkor, formatTanggal } from "@/lib/format";
import { asetDetail } from "@/lib/routes";
import { categoryFor, computeScore, intervalText, type ScoringParams } from "@/lib/scoring";
import { assessmentInput, INDICATORS, type Indicator } from "@/lib/schemas/assessment";
import { todayJakarta } from "@/lib/schemas/date";
import { cn } from "@/lib/utils";

const SCALE = [
  "Risiko sangat rendah",
  "Risiko rendah",
  "Risiko sedang",
  "Risiko tinggi",
  "Risiko sangat tinggi",
];
const FIELD =
  "w-full rounded-md border border-input bg-surface-raised px-3 py-2 text-base lg:text-body text-ink aria-invalid:border-destructive";
const pct = (w: number) => `${Math.round(w * 100)}%`;

interface Props {
  code: string;
  assetName: string;
  params: ScoringParams;
  rubric: Rubric;
  /** Nilai awal bila draf dipakai (null = tidak ada draf). */
  draft: { values: FormValues; updatedAt: string } | null;
  /** Nilai awal tanpa draf (skor penilaian terakhir atau kosong). */
  fallback: { values: FormValues; source: Exclude<DefaultSource, "draft"> };
}

function Err({ id, msg }: { id: string; msg?: string }) {
  return msg ? (
    <p id={id} className="mt-1.5 text-label text-status-error">
      {msg}
    </p>
  ) : null;
}

function Preview({ values, params, className }: { values: FormValues; params: ScoringParams; className?: string }) {
  const all = INDICATORS.map((k) => values.scores[k] ?? null);
  const score = computeScore(Object.fromEntries(INDICATORS.map((k, i) => [k, all[i]])), params.indicators);
  const level = categoryFor(score, values.critical_override, params.thresholds);
  const incomplete = score == null;
  return (
    <div className={className}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <RiskBadge level={level} override={values.critical_override} />
        <span className="text-label text-ink-muted">
          {incomplete ? "Belum lengkap" : `Skor ${formatSkor(score)} · ${intervalText(level, params)}`}
        </span>
      </div>
      <ScoreBar className="mt-2" score={score} level={incomplete ? "unrated" : level} compact />
      {incomplete && (
        <p className="mt-1.5 text-caption text-ink-muted">
          Skor dihitung setelah semua indikator dipilih. &quot;Belum diketahui&quot; tidak dihitung.
        </p>
      )}
    </div>
  );
}

export function AssessmentForm({ code, assetName, params, rubric, draft, fallback }: Props) {
  const router = useRouter();
  const [hasDraft, setHasDraft] = useState(draft);
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const summary = useRef<HTMLDivElement>(null);
  const { control, setValue, register, reset, getValues } = useForm<FormValues>({
    defaultValues: (draft ?? fallback).values,
  });
  const values = useWatch({ control }) as FormValues;
  const needFindings = findingsRequired(values);
  const showFindings = needFindings || !!values.findings;
  const today = todayJakarta();

  const showErrors = (e: Record<string, string>, msg: string | null) => {
    setErrors(e);
    setFormError(msg);
    // Tunggu ringkasan dirender, lalu pindahkan fokus (§6.9).
    requestAnimationFrame(() => summary.current?.focus());
  };
  const clear = (k: string) =>
    errors[k] && setErrors((p) => Object.fromEntries(Object.entries(p).filter(([x]) => x !== k)));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = toPayload(getValues(), code);
    const parsed = assessmentInput.safeParse(payload);
    if (!parsed.success) return showErrors(mapFieldErrors(issuesToFieldErrors(parsed.error.issues)), null);
    startTransition(async () => {
      const r = await saveAssessment(payload);
      if (r.ok) {
        toast.success("Penilaian disimpan.");
        router.push(asetDetail(code));
      } else showErrors(mapFieldErrors(r.fieldErrors), r.fieldErrors ? null : r.error);
    });
  };

  const onDraft = () =>
    startTransition(async () => {
      const v = getValues();
      const scores: Partial<Record<Indicator, number | null>> = {};
      for (const k of INDICATORS) if (v.scores[k] !== undefined) scores[k] = v.scores[k];
      const r = await saveAssessmentDraft({ ...v, asset_code: code, scores });
      if (r.ok) {
        setErrors({});
        setFormError(null);
        setHasDraft({ values: v, updatedAt: r.data.updated_at });
        toast.success("Draf disimpan.");
      } else showErrors(mapFieldErrors(r.fieldErrors), r.fieldErrors ? null : r.error);
    });

  const onDiscard = () =>
    startTransition(async () => {
      const r = await discardAssessmentDraft(code);
      if (!r.ok) return showErrors({}, r.error);
      reset(fallback.values);
      setHasDraft(null);
      setErrors({});
      setFormError(null);
      toast.success("Draf dibuang.");
    });

  const errorList = Object.entries(errors);
  const sourceNote: ReactNode = hasDraft ? (
    <>
      Melanjutkan draf tersimpan {formatTanggal(hasDraft.updatedAt)}.{" "}
      <button type="button" onClick={onDiscard} disabled={pending} className="min-h-11 underline underline-offset-2 lg:min-h-0">
        Buang draf
      </button>
    </>
  ) : fallback.source === "last" ? (
    "Skor diisi dari penilaian terakhir. Ubah sesuai kondisi saat ini."
  ) : null;

  return (
    <form onSubmit={onSubmit} noValidate aria-busy={pending} className="mt-6 grid gap-8 pb-28 lg:grid-cols-[minmax(0,1fr)_20rem] lg:pb-0">
      <div className="min-w-0 space-y-8">
        {sourceNote && (
          <p role="status" className="border border-rule-strong px-3 py-2 text-body text-ink-muted">
            {sourceNote}
          </p>
        )}

        {(errorList.length > 0 || formError) && (
          <div
            ref={summary}
            tabIndex={-1}
            role="alert"
            className="border border-destructive px-4 py-3 outline-offset-2"
          >
            <h2 className="text-label font-semibold text-status-error">
              {formError ?? `${errorList.length} isian perlu diperbaiki`}
            </h2>
            {errorList.length > 0 && (
              <ul className="mt-1 list-disc pl-5 text-body">
                {errorList.map(([k, m]) => (
                  <li key={k}>
                    <a
                      href={`#${fieldId(k)}`}
                      className="underline underline-offset-2"
                      onClick={(e) => {
                        const el = document.getElementById(fieldId(k));
                        if (el) {
                          e.preventDefault();
                          el.focus();
                          el.scrollIntoView({ block: "center" });
                        }
                      }}
                    >
                      {m}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div>
          <Label htmlFor={fieldId("assessed_at")}>Tanggal penilaian</Label>
          <Input className="text-base lg:text-body mt-1.5 max-w-52"
            id={fieldId("assessed_at")}
            type="date"
            max={today}
            required
            aria-required="true"
            aria-invalid={!!errors.assessed_at}
            aria-describedby={errors.assessed_at ? "err-assessed_at" : undefined}
            {...register("assessed_at", { onChange: () => clear("assessed_at") })}
          />
          <Err id="err-assessed_at" msg={errors.assessed_at} />
        </div>

        <p className="text-body text-ink-muted">1 = risiko sangat rendah · 5 = risiko sangat tinggi</p>

        {params.indicators.map((ind) => {
          const path = `scores.${ind.key}`;
          const err = errors[path];
          const cur = values.scores[ind.key];
          const rows: { v: number | null; title: string; text?: string }[] = [
            ...SCALE.map((title, i) => ({ v: i + 1, title, text: rubric[ind.key]?.[i] })),
            { v: null, title: "Belum diketahui" },
          ];
          return (
            <fieldset
              key={ind.key}
              id={fieldId(path)}
              tabIndex={-1}
              aria-describedby={err ? `err-${ind.key}` : undefined}
              className="min-w-0 outline-offset-4"
            >
              <legend className="mb-2 text-subtitle font-semibold text-ink">
                {ind.label} · bobot {pct(ind.weight)}
              </legend>
              <div className="space-y-2">
                {rows.map((r) => {
                  const checked = cur !== undefined && cur === r.v;
                  return (
                    <label
                      key={String(r.v)}
                      className={cn(
                        "flex min-h-14 w-full cursor-pointer items-start gap-3 border px-3 py-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus",
                        checked ? "border-ink bg-surface-sunken" : "border-rule hover:bg-surface-sunken/60",
                        r.v == null && !checked && "hatch-unrated",
                        err && "border-destructive",
                      )}
                    >
                      <input
                        type="radio"
                        name={path}
                        checked={checked}
                        onChange={() => {
                          setValue(`scores.${ind.key}`, r.v, { shouldDirty: true });
                          clear(path);
                        }}
                        className="mt-1.5 size-4 shrink-0 accent-[var(--ink)]"
                      />
                      <span className="w-6 shrink-0 text-center text-subtitle font-semibold tabular-nums" aria-hidden="true">
                        {r.v ?? "?"}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-body font-medium text-ink">
                          <span className="sr-only">{r.v ? `${r.v}. ` : ""}</span>
                          {r.title}
                        </span>
                        {r.text && <span className="mt-0.5 block text-body text-ink-muted">{r.text}</span>}
                      </span>
                    </label>
                  );
                })}
              </div>
              <Err id={`err-${ind.key}`} msg={err} />
            </fieldset>
          );
        })}

        <section aria-labelledby="h-override" className="space-y-4 border-t border-rule-strong pt-6">
          <h2 id="h-override" className="text-subtitle font-semibold">
            Override dan catatan
          </h2>
          <div className="flex items-start gap-3">
            <Checkbox
              id={fieldId("critical_override")}
              checked={values.critical_override}
              onCheckedChange={(c) => setValue("critical_override", c === true, { shouldDirty: true })}
              className="mt-0.5"
            />
            <Label htmlFor={fieldId("critical_override")} className="items-start leading-snug">
              Override ke Critical (abaikan skor)
            </Label>
          </div>
          {values.critical_override && (
            <div>
              <Label htmlFor={fieldId("override_reason")}>Alasan override Critical</Label>
              <textarea
                id={fieldId("override_reason")}
                rows={3}
                required
                aria-required="true"
                aria-invalid={!!errors.override_reason}
                aria-describedby={errors.override_reason ? "err-override_reason" : undefined}
                className={cn(FIELD, "mt-1.5")}
                {...register("override_reason", { onChange: () => clear("override_reason") })}
              />
              <Err id="err-override_reason" msg={errors.override_reason} />
            </div>
          )}
          {showFindings && (
            <div>
              <Label htmlFor={fieldId("findings")}>Catatan temuan{needFindings && " (wajib)"}</Label>
              <textarea
                id={fieldId("findings")}
                rows={4}
                aria-required={needFindings}
                aria-invalid={!!errors.findings}
                aria-describedby={errors.findings ? "err-findings" : undefined}
                className={cn(FIELD, "mt-1.5")}
                {...register("findings", { onChange: () => clear("findings") })}
              />
              <Err id="err-findings" msg={errors.findings} />
            </div>
          )}
          <div>
            <Label htmlFor={fieldId("follow_up")}>Tindak lanjut (opsional)</Label>
            <textarea
              id={fieldId("follow_up")}
              rows={3}
              aria-invalid={!!errors.follow_up}
              aria-describedby={errors.follow_up ? "err-follow_up" : undefined}
              className={cn(FIELD, "mt-1.5")}
              {...register("follow_up", { onChange: () => clear("follow_up") })}
            />
            <Err id="err-follow_up" msg={errors.follow_up} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor={fieldId("follow_up_pic")}>PIC tindak lanjut (opsional)</Label>
              <Input className="text-base lg:text-body mt-1.5"
                id={fieldId("follow_up_pic")}
                autoComplete="off"
                aria-invalid={!!errors.follow_up_pic}
                aria-describedby={errors.follow_up_pic ? "err-follow_up_pic" : undefined}
                {...register("follow_up_pic", { onChange: () => clear("follow_up_pic") })}
              />
              <Err id="err-follow_up_pic" msg={errors.follow_up_pic} />
            </div>
            <div>
              <Label htmlFor={fieldId("target_date")}>Target selesai (opsional)</Label>
              <Input className="text-base lg:text-body mt-1.5"
                id={fieldId("target_date")}
                type="date"
                aria-invalid={!!errors.target_date}
                aria-describedby={errors.target_date ? "err-target_date" : undefined}
                {...register("target_date", { onChange: () => clear("target_date") })}
              />
              <Err id="err-target_date" msg={errors.target_date} />
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3 border-t border-rule-strong pt-6">
          <Button type="submit" disabled={pending}>
            {pending && <Loader2Icon className="animate-spin" aria-hidden="true" />}
            Simpan penilaian
          </Button>
          <Button type="button" variant="secondary" disabled={pending} onClick={onDraft}>
            Simpan draf
          </Button>
          <Button asChild variant="ghost">
            <Link href={asetDetail(code)}>Batal</Link>
          </Button>
        </div>
      </div>

      <aside aria-label="Pratinjau skor" className="hidden lg:block">
        <div className="sticky top-8 border border-rule-strong bg-surface-raised p-4">
          <p className="text-label text-ink-muted">{assetName}</p>
          <h2 className="mb-3 text-subtitle font-semibold">Pratinjau skor</h2>
          <Preview values={values} params={params} />
        </div>
      </aside>

      <aside
        aria-label="Pratinjau skor"
        className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-20 border-t border-rule-strong bg-surface-raised px-4 py-2 lg:hidden"
      >
        <Preview values={values} params={params} />
      </aside>
    </form>
  );
}
