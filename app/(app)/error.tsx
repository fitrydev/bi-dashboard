"use client";

import { Button } from "@/components/ui/button";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div role="alert" className="max-w-[68ch] space-y-3 py-10">
      <h1 className="text-title text-ink">Halaman tidak dapat dimuat</h1>
      <p className="text-body text-ink-muted">
        Terjadi kesalahan saat menampilkan halaman ini. Bagian lain aplikasi tetap berfungsi.
      </p>
      <Button variant="outline" onClick={() => reset()}>
        Coba lagi
      </Button>
    </div>
  );
}
