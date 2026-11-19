import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Memuat halaman" role="status" className="space-y-6">
      <div className="space-y-3 border-b border-rule-strong pb-5">
        <Skeleton className="h-8 w-1/2 bg-rule/60" />
        <Skeleton className="h-4 w-3/4 bg-rule/60" />
      </div>
      {[90, 60, 75, 45].map((w) => (
        <Skeleton key={w} className="h-6 bg-rule/60" style={{ width: `${w}%` }} />
      ))}
    </div>
  );
}
