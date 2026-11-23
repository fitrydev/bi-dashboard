import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ledger/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { loadAsetList } from "@/lib/aset/load";
import { createClient } from "@/lib/supabase/server";
import { SectionBoundary } from "../dashboard/client";
import { AsetList } from "./client";

export const metadata: Metadata = { title: "Daftar Aset" };

export default function Page() {
  return (
    <>
      <PageHeader
        title="Daftar Aset"
        sub="Seluruh aset aktif beserta skor, kategori risiko, dan jadwal monitoringnya. Saring, urutkan, lalu buka satu aset."
      />
      <SectionBoundary what="Daftar aset">
        <Suspense fallback={<ListSkeleton />}>
          <Body />
        </Suspense>
      </SectionBoundary>
    </>
  );
}

async function Body() {
  const supabase = await createClient();
  const [{ rows, regions }, role] = await Promise.all([loadAsetList(), supabase.rpc("current_app_role")]);
  // Hanya untuk menampilkan tombol; Server Action tetap memeriksa role (requireRole).
  const canEdit = role.data === "editor" || role.data === "admin";
  return <AsetList rows={rows} regions={regions} canEdit={canEdit} />;
}

function ListSkeleton() {
  return (
    <div aria-busy="true" className="mt-4 space-y-px">
      <Skeleton className="h-11 w-full bg-rule/60" />
      {[72, 55, 88, 63, 47, 80, 58, 69].map((w, i) => (
        <Skeleton key={i} className="h-12 bg-rule/60" style={{ width: `${w + 12}%` }} />
      ))}
    </div>
  );
}
