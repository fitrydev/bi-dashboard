import type { Metadata } from "next";
import { EmptyState } from "@/components/ledger/EmptyState";
import { PageHeader } from "@/components/ledger/PageHeader";

export const metadata: Metadata = { title: "Panduan" };

export default function Page() {
  return (
    <>
      <PageHeader title="Panduan" sub="Cara membaca skor, kategori, dan jadwal monitoring." />
      <EmptyState
        purpose="Halaman ini akan menjelaskan rumus skor, arti tiap kategori, dan cara mengisi penilaian."
        why="Isi panduan belum ditulis; akan disusun setelah alur utama aplikasi berjalan."
        next="Sementara itu, legenda kategori tersedia di Dashboard."
      />
    </>
  );
}
