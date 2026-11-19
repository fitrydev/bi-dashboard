import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-[68ch] space-y-3 px-4 py-16">
      <h1 className="text-title text-ink">Halaman tidak ditemukan</h1>
      <p className="text-body text-ink-muted">
        Alamat yang Anda buka tidak ada atau sudah dipindahkan.
      </p>
      <Button asChild variant="outline">
        <Link href="/dashboard">Ke Dashboard</Link>
      </Button>
    </main>
  );
}
