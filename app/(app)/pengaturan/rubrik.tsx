"use client";

import { Lock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Tag } from "@/components/ledger/Tag";
import { updateParamsDraft } from "@/lib/actions/settings";
import { INDICATORS, rubricRow } from "@/lib/schemas/settings";
import { SHORT_LABEL } from "@/lib/scoring";
import type { CriteriaRow, ParamsVersion } from "@/lib/settings/types";
import { href } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { Busy } from "./ui";

const key = (i: string, s: number) => `${i}:${s}`;

export function RubrikTab({ versions, selected, criteria }: { versions: ParamsVersion[]; selected: ParamsVersion; criteria: CriteriaRow[] }) {
  const router = useRouter();
  const saved = new Map(criteria.map((c) => [key(c.indicator, c.score), c]));
  const editable = !selected.locked;
  const [text, setText] = useState<Record<string, string>>(() => Object.fromEntries(criteria.map((c) => [key(c.indicator, c.score), c.description])));
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const dirtyKeys = [...saved].filter(([k, c]) => text[k] !== c.description).map(([k]) => k);

  const save = () => {
    const rows = dirtyKeys.map((k) => {
      const [indicator, score] = k.split(":");
      return { indicator: indicator as CriteriaRow["indicator"], score: Number(score), description: text[k] };
    });
    const bad: Record<string, string> = {};
    for (const r of rows) {
      const p = rubricRow.safeParse(r);
      if (!p.success) bad[key(r.indicator, r.score)] = p.error.issues[0].message;
    }
    setErrs(bad);
    if (Object.keys(bad).length) return void toast.error("Periksa kembali deskripsi yang ditandai.");
    start(async () => {
      const r = await updateParamsDraft({ version: selected.version, rubric: rows as never });
      if (r.ok) {
        toast.success(`Rubrik draf versi ${selected.version} disimpan (${rows.length} deskripsi)`);
        router.refresh();
      } else toast.error(r.error);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <nav aria-label="Pilih versi rubrik" className="flex flex-wrap gap-2">
          {versions.map((v) => (
            <Link
              key={v.version}
              href={href("/pengaturan", { tab: "rubrik", versi: v.version })}
              aria-current={v.version === selected.version ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 items-center border px-3 text-label lg:min-h-9",
                v.version === selected.version ? "border-ink bg-ink font-medium text-surface" : "border-rule-strong text-ink hover:bg-surface-sunken",
              )}
            >
              Versi {v.version}
              {v.is_active ? " (aktif)" : v.locked ? "" : " (draf)"}
            </Link>
          ))}
        </nav>
        {!editable && (
          <Tag>
            <Lock className="size-3" aria-hidden="true" />
            Terkunci
          </Tag>
        )}
      </div>
      <p className="max-w-[68ch] text-body text-ink-muted">
        {editable
          ? "Ubah deskripsi tiap skor lalu simpan. Rubrik draf harus lengkap (6 indikator × 5 skor) sebelum versi bisa diaktifkan."
          : "Versi ini terkunci (aktif atau pernah dipakai), jadi rubriknya hanya dibaca. Buat draf baru di tab Parameter skor untuk mengubahnya."}
      </p>

      {criteria.length === 0 ? (
        <p className="text-body text-ink-muted">Rubrik versi ini kosong.</p>
      ) : (
        <div className="space-y-8" data-testid="rubrik">
          {INDICATORS.map((ind) => (
            <section key={ind} aria-labelledby={`rb-${ind}`} className="border-t border-rule pt-4">
              <h3 id={`rb-${ind}`} className="mb-3 text-body-lg font-semibold text-ink">
                {SHORT_LABEL[ind]}
              </h3>
              {(() => {
                const List = editable ? "ol" : "dl";
                const Item = editable ? "li" : "div";
                return (
                  <List className="space-y-3">
                    {[1, 2, 3, 4, 5].map((s) => {
                      const k = key(ind, s);
                      const c = saved.get(k);
                      const id = `rb-${ind}-${s}`;
                      const lab = (
                        <>
                          {s}
                          {s === 1 ? " · risiko sangat rendah" : s === 5 ? " · risiko sangat tinggi" : ""}
                          {c?.revised_from_excel && (
                            <span className="mt-1 block font-normal text-ink-muted" data-testid="revised-tag">
                              <Tag>Direvisi dari Excel</Tag>
                            </span>
                          )}
                        </>
                      );
                      return (
                        <Item key={s} className="grid gap-1 sm:grid-cols-[10rem_1fr] sm:gap-4">
                          {editable ? (
                            <>
                              <label htmlFor={id} className="text-label font-medium text-ink">
                                {lab}
                              </label>
                              <div>
                                <textarea
                                  id={id}
                                  rows={3}
                                  value={text[k] ?? ""}
                                  onChange={(e) => setText((p) => ({ ...p, [k]: e.target.value }))}
                                  aria-invalid={!!errs[k]}
                                  aria-describedby={errs[k] ? `${id}-err` : undefined}
                                  maxLength={2100}
                                  className="min-h-20 w-full rounded-md border border-input bg-surface-raised px-3 py-2 text-base text-ink aria-invalid:border-destructive"
                                />
                                {errs[k] && (
                                  <p id={`${id}-err`} role="alert" className="text-caption text-status-error">
                                    {errs[k]}
                                  </p>
                                )}
                              </div>
                            </>
                          ) : (
                            <>
                              <dt className="text-label font-medium text-ink">{lab}</dt>
                              <dd id={id} className="max-w-[72ch] text-body text-ink">
                                {text[k] || <span className="text-ink-muted">Belum diisi</span>}
                              </dd>
                            </>
                          )}
                        </Item>
                      );
                    })}
                  </List>
                );
              })()}
            </section>
          ))}
        </div>
      )}

      {editable && criteria.length > 0 && (
        <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] flex flex-wrap items-center gap-3 border-t border-rule-strong bg-surface py-3 lg:bottom-0">
          <Busy type="button" pending={pending} disabled={dirtyKeys.length === 0} onClick={save}>
            Simpan rubrik
          </Busy>
          <span className="text-caption text-ink-muted" aria-live="polite">
            {dirtyKeys.length ? `${dirtyKeys.length} deskripsi berubah, belum disimpan.` : "Tidak ada perubahan."}
          </span>
        </div>
      )}
    </div>
  );
}
