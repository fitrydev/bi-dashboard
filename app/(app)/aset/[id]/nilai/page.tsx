import type { Metadata } from "next";
import { Suspense } from "react";
import { EmptyState } from "@/components/ledger/EmptyState";
import { PageHeader } from "@/components/ledger/PageHeader";

export const metadata: Metadata = { title: "Nilai Aset" };

async function Body({ params }: { params: PageProps<"/aset/[id]/nilai">["params"] }) {
  const { id } = await params;
  return (
    <>
      <PageHeader
        title="Nilai Aset"
        sub={
          <>
            Kode aset: <span className="font-mono text-ink">{decodeURIComponent(id)}</span>
          </>
        }
      />
      <EmptyState
        purpose="Halaman ini akan berisi formulir penilaian enam indikator (skala 1 sampai 5) dengan skor dan kategori yang dihitung otomatis."
        why="Belum dapat dipakai: skema database dan parameter penilaian dibangun di Fase 2."
        next="Langkah berikut: formulir dibuat setelah data aset tersedia."
      />
    </>
  );
}

export default function Page(props: PageProps<"/aset/[id]/nilai">) {
  return (
    <Suspense fallback={<PageHeader title="Nilai Aset" />}>
      <Body params={props.params} />
    </Suspense>
  );
}
