import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Akses ditolak" };

export default function AksesDitolakPage() {
  return (
    <main id="konten" className="mx-auto w-full max-w-sm px-4 pt-[10vh] pb-12">
      <h1 className="font-serif text-display text-ink">Akses ditolak</h1>
      <p className="mt-6 border-t border-rule-strong pt-6 text-body-lg text-ink-muted">
        Email Anda tidak terdaftar, atau aksesnya telah dicabut. Hubungi admin untuk meminta atau
        memulihkan akses.
      </p>
      <Link href="/login" className="mt-6 inline-block text-body text-ink underline underline-offset-4">
        Kembali ke halaman masuk
      </Link>
    </main>
  );
}
