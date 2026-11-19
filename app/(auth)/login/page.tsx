import type { Metadata } from "next";
import { Suspense } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { LoginButton } from "./LoginButton";

export const metadata: Metadata = { title: "Masuk" };

async function AuthError({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const { galat } = await searchParams;
  if (galat !== "auth") return null;
  return (
    <p role="alert" className="mb-4 border-y border-rule py-2 text-label text-status-error">
      Proses masuk gagal. Pastikan memakai akun Google yang terdaftar, lalu coba lagi.
    </p>
  );
}

export default function LoginPage(props: PageProps<"/login">) {
  const configured = getSupabaseEnv() !== null;
  return (
    <div className="min-h-screen">
      <div className="flex justify-end px-4 py-3">
        <ThemeToggle />
      </div>
      <main id="konten" className="mx-auto w-full max-w-sm px-4 pt-[10vh] pb-12">
        <h1 className="font-serif text-display text-ink">Buku Besar Risiko</h1>
        <p className="mt-1 text-caption text-ink-subtle">Monitoring Aset 2027</p>
        <p className="mt-6 border-t border-rule-strong pt-6 text-body-lg text-ink-muted">
          Pantau skor dan kategori risiko aset tanah dan bangunan, serta jadwal monitoringnya.
        </p>
        <div className="mt-6">
          <Suspense fallback={null}>
            <AuthError searchParams={props.searchParams} />
          </Suspense>
          <LoginButton configured={configured} />
          <p className="mt-4 text-label text-ink-subtle">
            Akses terbatas pada email yang sudah didaftarkan (allowlist).
          </p>
        </div>
      </main>
    </div>
  );
}
