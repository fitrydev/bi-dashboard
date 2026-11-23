"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { recordMonitoring } from "@/lib/actions/monitoring";
import { asetDetail } from "@/lib/routes";
import { monitoringInput, type MonitoringInput } from "@/lib/schemas/monitoring";

const MAX = 4000;
const METODE = [
  ["site_visit", "Kunjungan lapangan"],
  ["remote", "Jarak jauh"],
  ["desk_review", "Telaah dokumen"],
] as const;
const FIELDS = ["monitored_at", "method", "findings"] as const;

export function MonitoringForm({ code, today }: { code: string; today: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [summary, setSummary] = useState<string | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const f = useForm<MonitoringInput>({
    resolver: zodResolver(monitoringInput),
    defaultValues: { asset_code: code, monitored_at: today, method: undefined, findings: "" },
  });
  const { errors } = f.formState;
  const findings = useWatch({ control: f.control, name: "findings" });
  const left = MAX - (findings?.length ?? 0);
  const msg = (k: (typeof FIELDS)[number]) => errors[k]?.message as string | undefined;

  useEffect(() => {
    if (summary) summaryRef.current?.focus();
  }, [summary]);

  const submit = f.handleSubmit(
    (v) =>
      start(async () => {
        setSummary(null);
        const r = await recordMonitoring(v);
        if (r.ok) {
          toast.success("Monitoring tercatat.");
          router.push(asetDetail(code));
          return;
        }
        for (const [k, m] of Object.entries(r.fieldErrors ?? {}))
          if ((FIELDS as readonly string[]).includes(k)) f.setError(k as (typeof FIELDS)[number], { message: m[0] });
        setSummary(r.error);
      }),
    () => setSummary("Periksa kembali isian yang ditandai."),
  );

  return (
    <form onSubmit={submit} noValidate className="mt-6 max-w-xl space-y-6">
      {summary && (
        <div ref={summaryRef} tabIndex={-1} role="alert" className="border border-rule-strong px-3 py-3 text-body text-ink outline-none">
          <p className="text-label text-status-error">Tidak dapat disimpan</p>
          <p>{summary}</p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="monitored_at">Tanggal monitoring</Label>
        <Input
          id="monitored_at"
          type="date"
          max={today}
          aria-required="true"
          aria-invalid={!!msg("monitored_at")}
          aria-describedby={msg("monitored_at") ? "monitored_at-err" : undefined}
          className="text-base"
          {...f.register("monitored_at")}
        />
        {msg("monitored_at") && <p id="monitored_at-err" className="text-label text-status-error">{msg("monitored_at")}</p>}
      </div>

      <fieldset className="space-y-2" aria-describedby={msg("method") ? "method-err" : undefined}>
        <legend className="text-label font-medium text-ink">Metode</legend>
        <Controller
          control={f.control}
          name="method"
          render={({ field }) => (
            <RadioGroup value={field.value ?? ""} onValueChange={field.onChange} aria-required="true" aria-invalid={!!msg("method")} className="gap-2">
              {METODE.map(([v, l]) => (
                <Label
                  key={v}
                  htmlFor={`m-${v}`}
                  className="min-h-12 cursor-pointer gap-3 border border-rule-strong px-3 text-body has-[[data-state=checked]]:border-ink has-[[data-state=checked]]:bg-surface-sunken has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
                >
                  <RadioGroupItem id={`m-${v}`} value={v} />
                  {l}
                </Label>
              ))}
            </RadioGroup>
          )}
        />
        {msg("method") && <p id="method-err" className="text-label text-status-error">{msg("method")}</p>}
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="findings">Temuan (opsional)</Label>
        <textarea
          id="findings"
          rows={6}
          maxLength={MAX}
          inputMode="text"
          enterKeyHint="enter"
          aria-invalid={!!msg("findings")}
          aria-describedby={`findings-count${msg("findings") ? " findings-err" : ""}`}
          className="w-full rounded-md border border-input bg-surface-raised px-3 py-2 text-base text-ink aria-invalid:border-destructive"
          {...f.register("findings")}
        />
        <p id="findings-count" className="text-label text-ink-muted tabular-nums">
          Sisa {left.toLocaleString("id-ID")} karakter
        </p>
        {msg("findings") && <p id="findings-err" className="text-label text-status-error">{msg("findings")}</p>}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" disabled={pending} className="min-h-11 sm:order-2">
          {pending ? "Menyimpan…" : "Simpan monitoring"}
        </Button>
        <Button type="button" variant="outline" className="min-h-11" onClick={() => router.push(asetDetail(code))}>
          Batal
        </Button>
      </div>
    </form>
  );
}
