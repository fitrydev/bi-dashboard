"use client";

import { CircleAlert, CircleCheck, Download, Flag, TriangleAlert, Upload, XCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { commitImport } from "@/lib/actions/import";
import { columnLabel } from "@/lib/aset/audit";
import { toCsv } from "@/lib/export/csv";
import { IMPORT_MAX_BYTES, type CommitResult, type RowStatus } from "@/lib/import/contract";
import { diffRows, type DiffResult, type Existing } from "@/lib/import/diff";
import type { ImportData } from "@/lib/import/load";
import { toPayload, type RowResult } from "@/lib/import/validate";
import type { WorkerRequest, WorkerResult } from "@/lib/import/worker";
import { formatAngka } from "@/lib/format";
import { cn } from "@/lib/utils";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const PAGE = 50;
const STEPS = ["Unggah", "Validasi dan pratinjau", "Konfirmasi"] as const;

const STATUS: Record<RowStatus, { label: string; Icon: typeof CircleCheck; cls: string }> = {
  rejected: { label: "Ditolak", Icon: XCircle, cls: "text-status-error" },
  warning: { label: "Peringatan data", Icon: TriangleAlert, cls: "text-status-warning-ink" },
  finding: { label: "Temuan risiko", Icon: Flag, cls: "text-ink" },
  ok: { label: "Siap", Icon: CircleCheck, cls: "text-status-success-ink" },
};
const DIFF = { new: "Baru", changed: "Berubah", same: "Sama" } as const;
const SHEET = { asset: "Master", assessment: "Penilaian" } as const;
const FILTERS = ["all", "rejected", "warning", "finding", "changed", "new"] as const;
type Filter = (typeof FILTERS)[number];
const FILTER_LABEL: Record<Filter, string> = {
  all: "Semua",
  rejected: "Ditolak",
  warning: "Peringatan",
  finding: "Temuan",
  changed: "Berubah",
  new: "Baru",
};

type Row = RowResult & { d: DiffResult };

const val = (v: unknown) =>
  v == null || v === "" ? "kosong" : typeof v === "number" ? formatAngka(v) : typeof v === "boolean" ? (v ? "Ya" : "Tidak") : String(v);
const WORKER_TIMEOUT_MS = 30_000;

function downloadErrorReport(rows: Row[], commit: CommitResult | null) {
  const lines: string[][] = [];
  for (const r of rows) {
    if (r.status === "ok" && !r.issues.length) continue;
    lines.push([String(r.row), SHEET[r.kind], r.asset_code, STATUS[r.status].label, r.issues.map((i) => i.message).join("; ")]);
  }
  for (const r of commit?.rows ?? [])
    if (r.action === "error") lines.push([String(r.row), SHEET[r.kind], r.asset_code, "Gagal disimpan", r.message ?? ""]);
  const csv = toCsv(
    lines,
    ["Baris", "Sheet", "Kode aset", "Status", "Pesan"].map((header, i) => ({ header, get: (l: string[]) => l[i] })),
  );
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "laporan-impor.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

export function ImportFlow({ data }: { data: ImportData }) {
  const [step, setStep] = useState(0);
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<CommitResult | null>(null);
  const [pending, start] = useTransition();
  const heading = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);
  const worker = useRef<Worker | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (first.current) first.current = false;
    else heading.current?.focus();
  }, [step]);
  useEffect(() => () => stopWorker(), []);

  function stopWorker() {
    clearTimeout(timer.current);
    worker.current?.terminate();
    worker.current = null;
  }

  const existing = useMemo<Existing>(
    () => ({ assets: new Map(data.assets), assessments: new Map(data.assessments) }),
    [data],
  );

  function fail(msg: string) {
    setError(msg);
    setBusy(false);
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!/\.xlsx$/i.test(file.name) || (file.type && file.type !== XLSX_MIME))
      return fail("Berkas harus berformat .xlsx (Excel). Format lain, seperti .xls atau .csv, belum didukung.");
    if (file.size > IMPORT_MAX_BYTES) return fail(`Ukuran berkas ${(file.size / 1048576).toFixed(1).replace(".", ",")} MB melebihi batas 5 MB.`);
    const buf = await file.arrayBuffer();
    const m = new Uint8Array(buf, 0, 4);
    if (m[0] !== 0x50 || m[1] !== 0x4b || m[2] !== 3 || m[3] !== 4) return fail("Isi berkas bukan Excel .xlsx yang valid.");
    setFileName(file.name);
    setBusy(true);
    stopWorker();
    const w = new Worker(new URL("../../../lib/import/worker.ts", import.meta.url), { type: "module" });
    worker.current = w;
    timer.current = setTimeout(() => {
      stopWorker();
      fail("Pemeriksaan berkas melebihi 30 detik dan dihentikan. Coba berkas yang lebih kecil atau ulangi.");
    }, WORKER_TIMEOUT_MS);
    w.onmessage = (e: MessageEvent<WorkerResult>) => {
      stopWorker();
      const out = e.data;
      if (!out.ok) return fail(out.error.message);
      const diffs = diffRows(out.results, existing);
      setRows(out.results.map((r, i) => ({ ...r, d: diffs[i] })));
      setFilter("all");
      setPage(0);
      setBusy(false);
      setStep(1);
    };
    w.onerror = () => {
      stopWorker();
      fail("Berkas tidak dapat diproses di peramban ini. Coba lagi.");
    };
    const req: WorkerRequest = {
      buf,
      ctx: {
        ...data.ctx,
        existingAssetCodes: new Set(data.assets.map(([c]) => c)),
        inactiveAssetCodes: new Set(data.inactive),
      },
    };
    w.postMessage(req, [buf]);
  }

  const count = (f: (r: Row) => boolean) => rows.filter(f).length;
  // Peringatan & Temuan tidak saling meniadakan (DESIGN §12.2): baris dihitung di tiap level yang
  // dimilikinya, kecuali baris Ditolak (tidak diimpor).
  const has = (r: Row, s: RowStatus) =>
    s === "warning" || s === "finding"
      ? r.status !== "rejected" && r.issues.some((i) => i.level === s)
      : r.status === s;
  const byStatus = (s: RowStatus) => count((r) => has(r, s));
  const byDiff = (d: string) => count((r) => r.d.diff === d);
  const payload = useMemo(() => toPayload(rows), [rows]);
  const shown = rows.filter((r) =>
    filter === "all" ? true : filter === "changed" || filter === "new" ? r.d.diff === filter : has(r, filter),
  );
  const pages = Math.max(1, Math.ceil(shown.length / PAGE));
  const slice = shown.slice(page * PAGE, page * PAGE + PAGE);
  const onlySame = payload.length > 0 && byDiff("same") === payload.length;

  function commit() {
    setError(null);
    start(async () => {
      const r = await commitImport({
        file_name: fileName,
        rows_total: rows.length,
        rows_warn: count((r) => r.status === "warning" || r.status === "finding"),
        rows_error: byStatus("rejected"),
        report_summary: { rejected: byStatus("rejected"), warning: byStatus("warning"), finding: byStatus("finding"), ok: byStatus("ok") },
        rows: payload,
      });
      if (!r.ok) return setError(r.error);
      setResult(r.data);
      toast.success(`Impor selesai: ${r.data.inserted} baru, ${r.data.updated} diperbarui`, { duration: 4000 });
    });
  }

  function cancelParse() {
    stopWorker();
    setBusy(false);
    setStep(0);
  }

  function reset() {
    setRows([]);
    setResult(null);
    setError(null);
    setStep(0);
  }

  const h2 = "text-title break-words text-ink outline-none focus-visible:underline";
  return (
    <div className="mt-6 max-w-5xl">
      <ol className="flex flex-wrap gap-x-6 gap-y-2 border-b border-rule pb-3 text-label">
        {STEPS.map((s, i) => (
          <li
            key={s}
            aria-current={i === step ? "step" : undefined}
            className={cn("min-h-6", i === step ? "font-semibold text-ink underline underline-offset-8" : "text-ink-muted")}
          >
            {i + 1}. {s}
          </li>
        ))}
      </ol>

      <div aria-live="polite" className="mt-4">
        {busy && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <p className="text-body text-ink-muted">Membaca dan memeriksa {fileName}…</p>
            <Button type="button" variant="outline" onClick={cancelParse}>
              Batal
            </Button>
          </div>
        )}
        {error && (
          <div role="alert" className="flex flex-wrap items-center gap-x-4 gap-y-2 text-status-error">
            <CircleAlert size={18} aria-hidden="true" />
            <p className="text-body">{error}</p>
            {step === 2 && !result && (
              <Button type="button" variant="outline" onClick={commit}>
                Coba lagi
              </Button>
            )}
          </div>
        )}
      </div>

      {step === 0 && (
        <section className="mt-4 space-y-5">
          <h2 ref={heading} tabIndex={-1} className={h2}>
            Unggah berkas Excel
          </h2>
          <label
            htmlFor="berkas"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              void onFile(e.dataTransfer.files[0]);
            }}
            className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-rule-strong p-6 text-center focus-within:outline-2 focus-within:outline-offset-2"
          >
            <Upload size={20} aria-hidden="true" />
            <span className="text-body text-ink">Pilih berkas .xlsx atau seret ke sini</span>
            <span className="text-label text-ink-muted">Maksimal 5 MB, sheet Master dan Penilaian.</span>
            <input
              id="berkas"
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              disabled={busy}
              className="sr-only"
              onChange={(e) => {
                void onFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          <p className="flex flex-wrap gap-x-6 gap-y-1 text-body">
            <a className="inline-flex min-h-11 items-center gap-1.5 underline underline-offset-2 lg:min-h-0" href="/export/template" download>
              <Download size={16} aria-hidden="true" />
              Unduh template
            </a>
            <a className="inline-flex min-h-11 items-center gap-1.5 underline underline-offset-2 lg:min-h-0" href="/export/xlsx" download>
              <Download size={16} aria-hidden="true" />
              Ekspor data saat ini (.xlsx)
            </a>
          </p>
        </section>
      )}

      {step === 1 && (
        <section className="mt-4 space-y-4">
          <h2 ref={heading} tabIndex={-1} className={h2}>
            Hasil pemeriksaan {fileName}
          </h2>
          {rows.length === 0 ? (
            <p className="text-body text-ink-muted">Berkas tidak berisi baris data. Periksa sheet Master dan Penilaian, lalu unggah ulang.</p>
          ) : (
            <>
              <Summary rows={rows} byStatus={byStatus} byDiff={byDiff} />
              <fieldset className="flex flex-wrap gap-2">
                <legend className="sr-only">Saring baris</legend>
                {FILTERS.map((f) => (
                  <label
                    key={f}
                    className={cn(
                      "inline-flex min-h-11 cursor-pointer items-center border px-3 text-label has-focus-visible:outline-2 lg:min-h-9",
                      filter === f ? "border-ink bg-ink text-surface" : "border-rule-strong text-ink",
                    )}
                  >
                    <input
                      type="radio"
                      name="saring"
                      className="sr-only"
                      checked={filter === f}
                      onChange={() => {
                        setFilter(f);
                        setPage(0);
                      }}
                    />
                    {FILTER_LABEL[f]}
                  </label>
                ))}
              </fieldset>
              <p className="text-label text-ink-muted" aria-live="polite">
                {formatAngka(shown.length)} baris
              </p>
              {shown.length === 0 ? (
                <p className="text-body text-ink-muted">Tidak ada baris untuk saringan ini.</p>
              ) : (
                <ul className="border-t border-rule">{slice.map((r) => <RowItem key={`${r.kind}${r.row}`} r={r} />)}</ul>
              )}
              {pages > 1 && (
                <nav aria-label="Halaman" className="flex items-center gap-3">
                  <Button type="button" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>
                    Sebelumnya
                  </Button>
                  <span className="text-label text-ink-muted">
                    {page + 1} dari {pages}
                  </span>
                  <Button type="button" variant="outline" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>
                    Berikutnya
                  </Button>
                </nav>
              )}
            </>
          )}
          <div className="flex flex-wrap gap-3 border-t border-rule pt-4">
            <Button type="button" variant="outline" onClick={reset}>
              Ganti berkas
            </Button>
            <Button type="button" disabled={payload.length === 0} onClick={() => setStep(2)}>
              Lanjut ke konfirmasi
            </Button>
          </div>
        </section>
      )}

      {step === 2 && !result && (
        <section className="mt-4 space-y-4">
          <h2 ref={heading} tabIndex={-1} className={h2}>
            Konfirmasi impor
          </h2>
          <p className="text-body text-ink">
            {formatAngka(payload.length)} baris akan diimpor ({formatAngka(byDiff("new"))} baru, {formatAngka(byDiff("changed"))} berubah,{" "}
            {formatAngka(byDiff("same"))} sama).{" "}
            {byStatus("rejected") > 0 && <>{formatAngka(byStatus("rejected"))} baris ditolak dilewati dan tidak disimpan. </>}
            Peringatan data dan temuan risiko tetap diimpor.
          </p>
          {onlySame && <p className="text-body text-ink-muted">Tidak ada perubahan: semua baris sama dengan data saat ini.</p>}
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" disabled={pending} onClick={() => setStep(1)}>
              Kembali
            </Button>
            <Button type="button" disabled={pending} onClick={commit}>
              {pending ? "Menyimpan…" : `Impor ${formatAngka(payload.length)} baris`}
            </Button>
          </div>
        </section>
      )}

      {step === 2 && result && (
        <section className="mt-4 space-y-4">
          <h2 ref={heading} tabIndex={-1} className={h2}>
            Impor selesai
          </h2>
          <p className="text-body text-ink">
            {formatAngka(result.inserted)} baru, {formatAngka(result.updated)} diperbarui, {formatAngka(result.unchanged)} tidak berubah,{" "}
            {formatAngka(result.errors)} gagal disimpan.
          </p>
          {result.errors > 0 && (
            <ul className="border-t border-rule">
              {result.rows
                .filter((r) => r.action === "error")
                .map((r) => (
                  <li key={`${r.kind}${r.row}`} className="flex items-start gap-2 border-b border-rule py-2 text-body text-ink">
                    <XCircle size={16} aria-hidden="true" className="mt-1 shrink-0 text-status-error" />
                    <span>
                      <b>Gagal</b> · {SHEET[r.kind]} baris {r.row} · {r.asset_code || "tanpa kode"}: {r.message}
                    </span>
                  </li>
                ))}
            </ul>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" onClick={() => downloadErrorReport(rows, result)}>
              <Download aria-hidden="true" />
              Unduh laporan error
            </Button>
            <Link className="inline-flex min-h-11 items-center underline underline-offset-2" href="/dashboard">
              Ke dasbor
            </Link>
            <Link className="inline-flex min-h-11 items-center underline underline-offset-2" href="/aset">
              Ke daftar aset
            </Link>
            <Button type="button" variant="ghost" onClick={reset}>
              Impor berkas lain
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}

function Summary({ rows, byStatus, byDiff }: { rows: Row[]; byStatus: (s: RowStatus) => number; byDiff: (d: string) => number }) {
  const S = (["rejected", "warning", "finding", "ok"] as const).map((k) => ({ k, ...STATUS[k], n: byStatus(k) }));
  return (
    <div className="space-y-2 border-y border-rule py-3">
      <p className="text-label text-ink-muted">{formatAngka(rows.length)} baris dibaca</p>
      <ul className="flex flex-wrap gap-x-6 gap-y-1">
        {S.map(({ k, label, Icon, cls, n }) => (
          <li key={k} className={cn("flex items-center gap-1.5 text-body", cls)}>
            <Icon size={16} aria-hidden="true" />
            {label}: {formatAngka(n)}
          </li>
        ))}
      </ul>
      <p className="text-body text-ink">
        Baru {formatAngka(byDiff("new"))} · Berubah {formatAngka(byDiff("changed"))} · Sama {formatAngka(byDiff("same"))}
      </p>
    </div>
  );
}

function RowItem({ r }: { r: Row }) {
  const s = STATUS[r.status];
  return (
    <li className="border-b border-rule py-3">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="min-w-24 text-body font-medium text-ink">{r.asset_code || "tanpa kode"}</span>
        <span className="text-label text-ink-muted">
          {SHEET[r.kind]} · baris {r.row}
        </span>
        <span className={cn("inline-flex items-center gap-1.5 text-label", s.cls)}>
          <s.Icon size={14} aria-hidden="true" />
          {s.label}
        </span>
        <span className="text-label text-ink">{r.d.diff ? DIFF[r.d.diff] : "Tidak diimpor"}</span>
      </div>
      {r.issues.length > 0 && (
        <ul className="mt-1 space-y-0.5">
          {r.issues.map((i, n) => (
            <li key={n} className="text-label text-ink-muted">
              {i.message}
            </li>
          ))}
        </ul>
      )}
      {r.d.diff === "changed" && (
        <details className="mt-1">
          <summary className="inline-flex min-h-11 cursor-pointer items-center text-label underline underline-offset-2 lg:min-h-6">
            Lihat {r.d.changes.length} perubahan
          </summary>
          <ul className="space-y-1 pb-1">
            {r.d.changes.map((c) => (
              <li key={c.field} className="text-label break-words text-ink">
                <b>{columnLabel(c.field === "region" ? "region_id" : c.field)}</b>: {val(c.before)} → {val(c.after)}
              </li>
            ))}
          </ul>
        </details>
      )}
    </li>
  );
}
