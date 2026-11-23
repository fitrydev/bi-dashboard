import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/ledger/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { loadAssetDetail } from "@/lib/aset/detail";
import { AuthError, requireRole } from "@/lib/auth/require-role";
import { asetDetail, safeDecode } from "@/lib/routes";
import { todayJakarta } from "@/lib/schemas/date";
import { MonitoringForm } from "./form";

export const metadata: Metadata = { title: "Catat Monitoring" };

async function Body({ code }: { code: string }) {
  let canEdit = true;
  try {
    await requireRole("editor");
  } catch (e) {
    if (!(e instanceof AuthError) || e.code !== "FORBIDDEN") throw e;
    canEdit = false;
  }
  // loadAssetDetail memanggil notFound() bila aset tidak ada.
  const d = await loadAssetDetail(code);
  if (!d.active)
    return (
      <p role="status" className="mt-6 max-w-[68ch] border border-rule-strong bg-surface-sunken px-3 py-3 text-body text-ink">
        Aset ini nonaktif, monitoring tidak bisa dicatat.
      </p>
    );
  return canEdit ? (
    <MonitoringForm code={code} today={todayJakarta()} />
  ) : (
    <p role="status" className="mt-6 max-w-[68ch] border border-rule-strong bg-surface-sunken px-3 py-3 text-body text-ink">
      Akun Anda hanya bisa melihat data. Pencatatan monitoring tersedia untuk editor dan admin.
    </p>
  );
}

export default async function Page(props: PageProps<"/aset/[code]/monitoring">) {
  const code = safeDecode((await props.params).code);
  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-3 text-label text-ink-muted">
        <Link href={asetDetail(code)} className="underline underline-offset-2">
          Kembali ke detail aset
        </Link>
      </nav>
      <PageHeader title="Catat monitoring" sub={<>Aset <span className="font-mono text-ink">{code}</span></>} />
      <Suspense fallback={<Skeleton className="mt-6 h-64 w-full max-w-xl bg-rule/60" />}>
        <Body code={code} />
      </Suspense>
    </>
  );
}
