import type { Metadata } from "next";
import { Suspense } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { LoginButton } from "./LoginButton";

export const metadata: Metadata = { title: "Masuk" };

const PESAN: Record<string, string> = {
  auth: "Proses masuk gagal. Coba lagi dengan akun Google Anda.",
  ditolak: "Email ini tidak terdaftar sebagai pengguna aplikasi. Hubungi admin untuk meminta akses.",
  dicabut: "Akses Anda telah dicabut. Hubungi admin bila ini keliru.",
};

async function AuthError({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const { galat } = await searchParams;
  const pesan = typeof galat === "string" ? PESAN[galat] : undefined;
  if (!pesan) return null;
  return (
    <p role="alert" className="mb-4 border-y border-rule py-2 text-label text-status-error">
      {pesan}
    </p>
  );
}

async function LoginForm({
  searchParams,
  configured,
}: {
  searchParams: PageProps<"/login">["searchParams"];
  configured: boolean;
}) {
  const { next } = await searchParams;
  return <LoginButton configured={configured} next={typeof next === "string" ? next : undefined} />;
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
          <Suspense fallback={null}>
            <LoginForm searchParams={props.searchParams} configured={configured} />
          </Suspense>
          <p className="mt-4 text-label text-ink-subtle">
            Akses terbatas pada email yang sudah didaftarkan (allowlist).
          </p>
        </div>
      </main>
    </div>
  );
}
