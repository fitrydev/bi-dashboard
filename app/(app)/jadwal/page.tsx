import type { Metadata } from "next";
import { EmptyState } from "@/components/ledger/EmptyState";
import { PageHeader } from "@/components/ledger/PageHeader";

export const metadata: Metadata = { title: "Jadwal Monitoring" };

export default function Page() {
  return (
    <>
      <PageHeader
        title="Jadwal Monitoring"
        sub="Kapan setiap aset harus dimonitor berikutnya, menurut kategori risikonya."
      />
      <EmptyState
        purpose="Halaman ini akan menampilkan aset yang jatuh tempo, terlambat, dan terjadwal."
        why="Data belum tersedia: jadwal dihitung dari penilaian aset, dan skema database dibangun di Fase 2."
        next="Langkah berikut: nilai aset pertama setelah data diimpor."
      />
    </>
  );
}
