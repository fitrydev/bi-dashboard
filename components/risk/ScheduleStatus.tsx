import { AlertTriangle, CalendarCheck, CalendarClock, CircleDashed, type LucideIcon } from "lucide-react";
import { dueText, type Due } from "@/lib/scoring";
import { cn } from "@/lib/utils";

export type ScheduleTone = "overdue" | "soon" | "scheduled" | "none";

/** Pemetaan murni Due -> nada, judul, ikon. */
export function scheduleView(d: Due): { tone: ScheduleTone; title: string; Icon: LucideIcon } {
  switch (d.status) {
    case "lewat":
      return { tone: "overdue", title: "Terlambat", Icon: AlertTriangle };
    case "segera":
      return { tone: "soon", title: "Segera", Icon: CalendarClock };
    case "terjadwal":
      return { tone: "scheduled", title: "Terjadwal", Icon: CalendarCheck };
    default:
      return { tone: "none", title: "Belum ada jadwal", Icon: CircleDashed };
  }
}

const TONE: Record<ScheduleTone, string> = {
  overdue: "text-status-error font-medium",
  soon: "text-status-warning-ink font-medium",
  scheduled: "text-ink",
  none: "text-ink-muted",
};

/** Status jadwal: ikon + judul + teks tenggat (tidak hanya warna). */
export function ScheduleStatus({ due, className }: { due: Due; className?: string }) {
  const { tone, title, Icon } = scheduleView(due);
  return (
    <span data-tone={tone} className={cn("inline-flex items-center gap-1.5 text-label", TONE[tone], className)}>
      <Icon size={14} aria-hidden="true" className="shrink-0" />
      <span>{title}</span>
      <span className="font-normal text-ink-muted">· {dueText(due)}</span>
    </span>
  );
}
