"use client";

import { Loader2 } from "lucide-react";
import { useState, type ComponentProps, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RiskBadge } from "@/components/risk";
import { formatAngka, formatSkor } from "@/lib/format";
import type { RiskLevel } from "@/lib/scoring";
import { cn } from "@/lib/utils";
import type { Impact } from "@/lib/settings/types";

/** Pilihan native: target sentuh 44px, 16px di mobile, dan perilaku OS yang akrab. ponytail: ganti ke Select Radix bila perlu gaya khusus. */
export function Sel({ className, ...p }: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "min-h-11 rounded-md border border-input bg-surface-raised px-3 py-1 text-body text-ink disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive lg:min-h-9",
        className,
      )}
      {...p}
    />
  );
}

export function Field({
  id,
  label,
  error,
  hint,
  children,
  className,
}: {
  id: string;
  label: ReactNode;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <label htmlFor={id} className="block text-label font-medium text-ink">
        {label}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="text-caption text-ink-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} role="alert" className="text-caption text-status-error">
          {error}
        </p>
      )}
    </div>
  );
}

/** Tombol dengan label tetap + indikator kecil saat berjalan (DESIGN §6.9). */
export function Busy({ pending, children, ...p }: ComponentProps<typeof Button> & { pending?: boolean }) {
  return (
    <Button {...p} disabled={p.disabled || pending} aria-busy={pending || undefined}>
      {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
      {children}
    </Button>
  );
}

export function Confirm({
  trigger,
  title,
  body,
  confirmLabel,
  destructive,
  onConfirm,
  disabled,
}: {
  trigger: (open: () => void) => ReactNode;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  disabled?: boolean;
  onConfirm: () => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <>
      {trigger(() => setOpen(true))}
      <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2 text-body text-ink-muted">{body}</div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={busy} onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Busy
              type="button"
              variant={destructive ? "destructive" : "default"}
              pending={busy}
              disabled={disabled}
              onClick={async () => {
                setBusy(true);
                try {
                  await onConfirm();
                } finally {
                  setBusy(false);
                  setOpen(false);
                }
              }}
            >
              {confirmLabel}
            </Busy>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

const lvl = (c: string | null | undefined): RiskLevel =>
  c === "critical" || c === "high" || c === "medium" || c === "low" ? c : "unrated";
const skor = (n: number | null) => (n == null ? "—" : formatSkor(n));

/** Ringkasan dampak (preview parameter / hitung ulang). "Belum dinilai" tidak pernah tampil seperti Low. */
export function ImpactView({ impact, title, level = 4 }: { impact: Impact; title: string; level?: 3 | 4 }) {
  const H = `h${level}` as "h3" | "h4";
  const H2 = `h${level + 1}` as "h4" | "h5";
  const { changes, changes_total: total } = impact;
  return (
    <div className="space-y-4" data-testid="impact">
      <H className="text-body-lg font-semibold text-ink">{title}</H>
      <p className="text-body text-ink">
        <span data-testid="impact-total">{formatAngka(impact.assessments_total)}</span> penilaian terakhir ditinjau;{" "}
        <span data-testid="impact-score">{formatAngka(impact.score_changed)}</span> berubah skor dan{" "}
        <span data-testid="impact-category">{formatAngka(impact.category_changed)}</span> pindah kategori.
      </p>
      {impact.matrix.some((m) => m.from !== m.to) ? (
        <div>
          <H2 className="mb-1 text-label font-medium text-ink">Perpindahan kategori (dari → ke)</H2>
          <ul className="divide-y divide-rule border-y border-rule">
            {impact.matrix
              .filter((m) => m.from !== m.to)
              .map((m) => (
                <li key={`${m.from}-${m.to}`} className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 py-1.5">
                  <RiskBadge level={lvl(m.from)} />
                  <span aria-hidden="true">→</span>
                  <span className="sr-only">menjadi</span>
                  <RiskBadge level={lvl(m.to)} />
                  <span className="ml-auto text-body tabular-nums text-ink">{formatAngka(m.count)} aset</span>
                </li>
              ))}
          </ul>
        </div>
      ) : (
        <p className="text-body text-ink-muted">Tidak ada aset yang pindah kategori.</p>
      )}
      {total > 0 && (
        <div>
          <H2 className="mb-1 text-label font-medium text-ink">
            Perubahan per aset ({formatAngka(Math.min(changes.length, total))} dari {formatAngka(total)})
          </H2>
          <ul className="max-h-96 divide-y divide-rule overflow-y-auto border-y border-rule" tabIndex={0} aria-label="Daftar perubahan skor per aset">
            {changes.map((c) => (
              <li key={c.assessment_id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                <div className="min-w-0 flex-1 basis-48">
                  <div className="truncate text-body text-ink">{c.name}</div>
                  <div className="text-caption text-ink-subtle">{c.asset_code}</div>
                </div>
                <span className="text-body tabular-nums text-ink">
                  {skor(c.old_score)} → {skor(c.new_score)}
                </span>
                <span className="flex items-center gap-1.5">
                  <RiskBadge level={lvl(c.old_category)} size="sm" />
                  <span aria-hidden="true">→</span>
                  <RiskBadge level={lvl(c.new_category)} size="sm" />
                </span>
              </li>
            ))}
          </ul>
          {total > changes.length && (
            <p className="mt-1 text-caption text-ink-muted">
              Daftar dibatasi {formatAngka(changes.length)} aset pertama menurut kode; ringkasan di atas mencakup semuanya.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
