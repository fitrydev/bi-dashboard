"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Section } from "@/components/ledger/Section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteRegionAlias, deleteUtilizationAlias, upsertRegionAlias, upsertUtilizationAlias } from "@/lib/actions/settings";
import { UTIL_OPTIONS } from "@/lib/aset/filters";
import { formatWilayah } from "@/lib/format";
import { regionAliasInput, utilizationAliasInput } from "@/lib/schemas/settings";
import type { Region, RegionAlias, UtilAlias, UtilStatus } from "@/lib/settings/types";
import { Busy, Field, Sel } from "./ui";

const UTIL = Object.fromEntries(UTIL_OPTIONS) as Record<UtilStatus, string>;

export function AliasTab({ regions, regionAliases, utilAliases }: { regions: Region[]; regionAliases: RegionAlias[]; utilAliases: UtilAlias[] }) {
  return (
    <div className="space-y-2">
      <p className="max-w-[68ch] text-body text-ink-muted" data-testid="alias-help">
        Alias dipakai langsung oleh impor Excel berikutnya; tidak perlu menerapkan atau memuat ulang apa pun. Teks dicocokkan tanpa memperhatikan huruf besar/kecil dan spasi di tepi.
      </p>
      <Section first id="alias-wilayah" title="Alias wilayah" sub="Nama wilayah lain di Excel (mis. JABAR) yang dipetakan ke satu wilayah resmi.">
        <RegionAliases regions={regions} items={regionAliases} />
      </Section>
      <Section id="alias-pemanfaatan" title="Alias pemanfaatan" sub="Teks status pemanfaatan di Excel yang dipetakan ke status baku. Tandai “perlu review” bila artinya masih ambigu.">
        <UtilAliases items={utilAliases} />
      </Section>
    </div>
  );
}

function RegionAliases({ regions, items }: { regions: Region[]; items: RegionAlias[] }) {
  const name = new Map(regions.map((r) => [r.id, r.name]));
  const [alias, setAlias] = useState("");
  const [rid, setRid] = useState("");
  const [err, setErr] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = regionAliasInput.safeParse({ alias, region_id: rid });
    if (!p.success) return setErr(Object.fromEntries(p.error.issues.map((i) => [String(i.path[0]), i.message])));
    setErr({});
    start(async () => {
      const r = await upsertRegionAlias(p.data);
      if (!r.ok) return void toast.error(r.error);
      toast.success(`Alias ${p.data.alias} disimpan`);
      setAlias("");
    });
  };
  return (
    <div className="space-y-4">
      <form onSubmit={submit} noValidate aria-label="Tambah alias wilayah" className="flex flex-wrap items-start gap-3">
        <Field id="ra-alias" label="Alias (teks di Excel)" error={err.alias} className="min-w-48 flex-1 basis-48">
          <Input id="ra-alias" value={alias} onChange={(e) => setAlias(e.target.value)} aria-invalid={!!err.alias} aria-describedby={err.alias ? "ra-alias-err" : undefined} autoComplete="off" className="text-base" />
        </Field>
        <Field id="ra-region" label="Wilayah resmi" error={err.region_id} className="min-w-48 flex-1 basis-48">
          <Sel id="ra-region" value={rid} onChange={(e) => setRid(e.target.value)} aria-invalid={!!err.region_id} aria-describedby={err.region_id ? "ra-region-err" : undefined} className="w-full">
            <option value="">Pilih wilayah…</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>
                {formatWilayah(r.name)}
              </option>
            ))}
          </Sel>
        </Field>
        <div className="pt-[1.375rem] max-sm:w-full">
          <Busy type="submit" pending={pending} className="max-sm:w-full">
            Simpan alias
          </Busy>
        </div>
      </form>
      {items.length === 0 ? (
        <p className="text-body text-ink-muted">Belum ada alias wilayah.</p>
      ) : (
        <ul className="divide-y divide-rule border-y border-rule" aria-label="Alias wilayah" data-testid="region-alias-list">
          {items.map((a) => (
            <li key={a.alias} className="flex min-h-12 items-center gap-3 py-1.5" data-testid={`region-alias-${a.alias}`}>
              <span className="min-w-0 flex-1 truncate text-body text-ink">
                <span className="font-medium">{a.alias}</span> <span aria-hidden="true">→</span> <span className="sr-only">dipetakan ke</span> {formatWilayah(name.get(a.region_id) ?? "?")}
              </span>
              <DelBtn label={`Hapus alias ${a.alias}`} run={() => deleteRegionAlias({ alias: a.alias })} undo={() => upsertRegionAlias(a)} done={`Alias ${a.alias} dihapus`} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function UtilAliases({ items }: { items: UtilAlias[] }) {
  const [raw, setRaw] = useState("");
  const [status, setStatus] = useState<UtilStatus | "">("");
  const [review, setReview] = useState(false);
  const [err, setErr] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = utilizationAliasInput.safeParse({ raw, status: status || undefined, needs_review: review });
    if (!p.success) return setErr(Object.fromEntries(p.error.issues.map((i) => [String(i.path[0]), i.message])));
    setErr({});
    start(async () => {
      const r = await upsertUtilizationAlias(p.data);
      if (!r.ok) return void toast.error(r.error);
      toast.success(`Alias “${p.data.raw}” disimpan`);
      setRaw("");
      setReview(false);
    });
  };
  return (
    <div className="space-y-4">
      <form onSubmit={submit} noValidate aria-label="Tambah alias pemanfaatan" className="flex flex-wrap items-start gap-3">
        <Field id="ua-raw" label="Teks di Excel" error={err.raw} className="min-w-48 flex-1 basis-48">
          <Input id="ua-raw" value={raw} onChange={(e) => setRaw(e.target.value)} aria-invalid={!!err.raw} aria-describedby={err.raw ? "ua-raw-err" : undefined} autoComplete="off" className="text-base" />
        </Field>
        <Field id="ua-status" label="Status baku" error={err.status} className="min-w-48 flex-1 basis-48">
          <Sel id="ua-status" value={status} onChange={(e) => setStatus(e.target.value as UtilStatus)} aria-invalid={!!err.status} aria-describedby={err.status ? "ua-status-err" : undefined} className="w-full">
            <option value="">Pilih status…</option>
            {UTIL_OPTIONS.map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </Sel>
        </Field>
        <label className="flex min-h-11 items-center gap-2 pt-[1.375rem] text-body text-ink">
          <input type="checkbox" checked={review} onChange={(e) => setReview(e.target.checked)} className="size-5 accent-[var(--color-ink)]" />
          Perlu review
        </label>
        <div className="pt-[1.375rem] max-sm:w-full">
          <Busy type="submit" pending={pending} className="max-sm:w-full">
            Simpan alias
          </Busy>
        </div>
      </form>
      {items.length === 0 ? (
        <p className="text-body text-ink-muted">Belum ada alias pemanfaatan.</p>
      ) : (
        <ul className="divide-y divide-rule border-y border-rule" aria-label="Alias pemanfaatan" data-testid="util-alias-list">
          {items.map((a) => (
            <li key={a.raw} className="flex min-h-12 items-center gap-3 py-1.5" data-testid={`util-alias-${a.raw}`}>
              <span className="min-w-0 flex-1 text-body text-ink">
                <span className="font-medium">“{a.raw}”</span> <span aria-hidden="true">→</span> <span className="sr-only">dipetakan ke</span> {UTIL[a.status]}
                {a.needs_review && <span className="ml-2 text-caption text-status-warning-ink">Perlu review</span>}
              </span>
              <DelBtn label={`Hapus alias ${a.raw}`} run={() => deleteUtilizationAlias({ raw: a.raw })} undo={() => upsertUtilizationAlias(a)} done={`Alias “${a.raw}” dihapus`} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type R = Promise<{ ok: boolean; error?: string }>;
function DelBtn({ label, run, undo, done }: { label: string; run: () => R; undo: () => R; done: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      disabled={pending}
      aria-label={label}
      onClick={() =>
        start(async () => {
          const r = await run();
          if (r.ok)
            toast(done, {
              duration: 8000,
              action: { label: "Urungkan", onClick: () => void undo().then((x) => (x.ok ? toast.success("Alias dikembalikan") : toast.error(x.error ?? "Gagal mengembalikan."))) },
            });
          else toast.error(r.error ?? "Gagal menghapus.");
        })
      }
    >
      <Trash2 aria-hidden="true" />
    </Button>
  );
}
