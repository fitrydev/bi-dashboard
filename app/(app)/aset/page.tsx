import type { Metadata } from "next";
import { EmptyState } from "@/components/ledger/EmptyState";
import { PageHeader } from "@/components/ledger/PageHeader";

export const metadata: Metadata = { title: "Daftar Aset" };

export default function Page() {
  return (
    <>
      <PageHeader
        title="Daftar Aset"
        sub="Seluruh aset tanah dan bangunan beserta skor dan kategori risikonya."
      />
      <EmptyState
        purpose="Halaman ini akan memuat daftar aset yang bisa disaring dan diurutkan berdasarkan kategori, wilayah, dan skor."
        why="Data belum tersedia: skema database dibangun di Fase 2."
        next="Langkah berikut: impor data aset dari Excel setelah skema siap."
      />
    </>
  );
}
