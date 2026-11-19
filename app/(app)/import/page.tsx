import type { Metadata } from "next";
import { EmptyState } from "@/components/ledger/EmptyState";
import { PageHeader } from "@/components/ledger/PageHeader";

export const metadata: Metadata = { title: "Import dan Ekspor" };

export default function Page() {
  return (
    <>
      <PageHeader
        title="Import dan Ekspor"
        sub="Memasukkan data dari berkas Excel dan mengunduh hasilnya."
      />
      <EmptyState
        purpose="Halaman ini akan memandu unggah berkas Excel, memeriksa baris bermasalah, lalu menyimpannya."
        why="Belum dapat dipakai: skema database dibangun di Fase 2, impor menyusul sesudahnya."
        next="Langkah berikut: siapkan berkas Excel template matriks risiko 2027."
      />
    </>
  );
}
