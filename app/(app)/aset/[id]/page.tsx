import type { Metadata } from "next";
import { Suspense } from "react";
import { EmptyState } from "@/components/ledger/EmptyState";
import { PageHeader } from "@/components/ledger/PageHeader";

export const metadata: Metadata = { title: "Detail Aset" };

async function Body({ params }: { params: PageProps<"/aset/[id]">["params"] }) {
  const { id } = await params;
  return (
    <>
      <PageHeader
        title="Detail Aset"
        sub={
          <>
            Kode aset: <span className="font-mono text-ink">{decodeURIComponent(id)}</span>
          </>
        }
      />
      <EmptyState
        purpose="Halaman ini akan menampilkan data aset, skor per indikator, riwayat penilaian, dan jadwal monitoring berikutnya."
        why="Data belum tersedia: skema database dibangun di Fase 2."
        next="Langkah berikut: setelah data diimpor, aset ini dapat dinilai."
      />
    </>
  );
}

export default function Page(props: PageProps<"/aset/[id]">) {
  return (
    <Suspense fallback={<PageHeader title="Detail Aset" />}>
      <Body params={props.params} />
    </Suspense>
  );
}
