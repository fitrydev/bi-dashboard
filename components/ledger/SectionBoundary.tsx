"use client";

import { catchError, type ErrorInfo } from "next/error";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Error inline per bagian: bagian lain tetap jalan; `retry` memuat ulang data server bagian ini. */
export const SectionBoundary = catchError(function SectionError(
  { what }: { what: string },
  { retry }: ErrorInfo,
) {
  return (
    <div role="alert" className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-rule pt-8 pb-4">
      <TriangleAlert size={18} aria-hidden="true" className="shrink-0 text-status-error" />
      <p className="text-body text-ink">{what} tidak dapat dimuat.</p>
      <Button type="button" variant="outline" onClick={() => retry()}>
        Coba lagi
      </Button>
    </div>
  );
});
