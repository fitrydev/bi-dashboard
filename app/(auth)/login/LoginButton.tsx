"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function LoginButton({ configured, next }: { configured: boolean; next?: string }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function signIn() {
    setBusy(true);
    setFailed(false);
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ""}` },
    });
    if (error) {
      setFailed(true);
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button onClick={signIn} disabled={!configured || busy} className="h-11 w-full">
        {busy ? "Mengalihkan ke Google…" : "Masuk dengan Google"}
      </Button>
      {!configured && (
        <p className="text-label text-ink-muted">
          Supabase belum dikonfigurasi — lihat .env.example
        </p>
      )}
      {failed && (
        <p role="alert" className="text-label text-status-error">
          Tidak dapat memulai proses masuk. Coba lagi.
        </p>
      )}
    </div>
  );
}
