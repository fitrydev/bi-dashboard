import type { ReactNode } from "react";

/** Keadaan kosong jujur: apa fungsi halaman, mengapa kosong, langkah berikut. Tanpa ilustrasi. */
export function EmptyState({
  purpose,
  why,
  next,
}: {
  purpose: ReactNode;
  why: ReactNode;
  next?: ReactNode;
}) {
  return (
    <div className="max-w-[68ch] space-y-3 py-4">
      <p className="text-body-lg text-ink">{purpose}</p>
      <p className="text-body text-ink-muted">{why}</p>
      {next && <p className="text-body text-ink-muted">{next}</p>}
    </div>
  );
}
