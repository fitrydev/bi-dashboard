import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder loading berdimensi sama dengan chart final (tanpa layout shift). Animasi pulse dimatikan oleh motion-reduce. */
export function ChartSkeleton({
  height = 232,
  label = "Memuat chart…",
}: {
  height?: number;
  label?: string;
}) {
  return (
    <div role="status" aria-busy="true" style={{ height }} className="w-full">
      <span className="sr-only">{label}</span>
      <Skeleton className="size-full motion-reduce:animate-none" />
    </div>
  );
}
