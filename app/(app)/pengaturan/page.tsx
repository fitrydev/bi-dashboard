import type { Metadata } from "next";
import { EmptyState } from "@/components/ledger/EmptyState";
import { PageHeader } from "@/components/ledger/PageHeader";

export const metadata: Metadata = { title: "Pengaturan" };

export default function Page() {
  return (
    <>
      <PageHeader
        title="Pengaturan"
        sub="Parameter penilaian, daftar email yang boleh masuk, dan preferensi."
      />
      <EmptyState
        purpose="Halaman ini akan mengelola bobot indikator, ambang kategori, dan allowlist pengguna."
        why="Belum dapat dipakai: parameter berversi tersimpan di database (Fase 2) dan akses admin diatur di Fase 3."
        next="Langkah berikut: tidak ada yang perlu Anda lakukan sekarang."
      />
    </>
  );
}
