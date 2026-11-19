"use client";

import { Button } from "@/components/ui/button";

export function TableToggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <Button type="button" variant="link" size="sm" aria-pressed={on} onClick={onClick}>
      {on ? "Tampilkan grafik" : "Tampilkan tabel"}
    </Button>
  );
}
