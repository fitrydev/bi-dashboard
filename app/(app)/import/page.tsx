import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ledger/PageHeader";
import { SectionBoundary } from "@/components/ledger/SectionBoundary";
import { Skeleton } from "@/components/ui/skeleton";
import { loadImportData } from "@/lib/import/load";
import { createClient } from "@/lib/supabase/server";
import { ImportFlow } from "./client";

export const metadata: Metadata = { title: "Impor Excel" };

export default function Page() {
  return (
    <>
      <PageHeader
        title="Impor Excel"
        sub="Unggah berkas template, periksa hasilnya baris demi baris, lalu simpan. Baris yang ditolak dilewati; sisanya tetap masuk."
      />
      <SectionBoundary what="Halaman impor">
        <Suspense fallback={<Skeleton aria-busy="true" className="mt-6 h-48 w-full bg-rule/60" />}>
          <Body />
        </Suspense>
      </SectionBoundary>
    </>
  );
}

async function Body() {
  const supabase = await createClient();
  const role = await supabase.rpc("current_app_role");
  // Hanya untuk menampilkan form; Server Action tetap memeriksa role (requireRole).
  if (role.data !== "editor" && role.data !== "admin") {
    return (
      <div className="mt-6 max-w-[68ch] space-y-2">
        <p className="text-body-lg text-ink">Peran Anda hanya-baca, jadi impor tidak tersedia.</p>
        <p className="text-body text-ink-muted">
          Anda tetap dapat{" "}
          <a className="underline underline-offset-2" href="/export/xlsx" download>
            mengunduh data saat ini (.xlsx)
          </a>
          . Hubungi admin bila perlu akses ubah.
        </p>
      </div>
    );
  }
  return <ImportFlow data={await loadImportData()} />;
}
