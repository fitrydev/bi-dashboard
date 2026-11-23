import {
  CalendarClockIcon,
  FileSpreadsheetIcon,
  HelpCircleIcon,
  LandmarkIcon,
  LayoutDashboardIcon,
  SettingsIcon,
  SquarePenIcon,
} from "lucide-react";
import { Suspense, type ReactNode } from "react";
import { NavLink } from "@/components/shell/NavLink";
import { UserMenu } from "@/components/shell/UserMenu";
import { ThemeToggle } from "@/components/theme-toggle";
import { AllowlistGate } from "@/lib/auth/allowlist";

const ic = { "aria-hidden": true, strokeWidth: 1.5 } as const;

const SIDE = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: <LayoutDashboardIcon className="size-[18px]" {...ic} />,
  },
  { href: "/aset", label: "Aset", icon: <LandmarkIcon className="size-[18px]" {...ic} /> },
  { href: "/jadwal", label: "Jadwal", icon: <CalendarClockIcon className="size-[18px]" {...ic} /> },
  {
    href: "/import",
    label: "Import",
    icon: <FileSpreadsheetIcon className="size-[18px]" {...ic} />,
  },
  {
    href: "/pengaturan",
    label: "Pengaturan",
    icon: <SettingsIcon className="size-[18px]" {...ic} />,
  },
  { href: "/panduan", label: "Panduan", icon: <HelpCircleIcon className="size-[18px]" {...ic} /> },
];

// Bottom-nav mobile (PLAN §6.3): Dashboard / Aset / Jadwal / Input.
// "Input" mengarah ke /import untuk sementara; alur penilaian/monitoring (Fase 4+) akan mengganti tujuannya.
const BOTTOM = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: <LayoutDashboardIcon className="size-5" {...ic} />,
  },
  { href: "/aset", label: "Aset", icon: <LandmarkIcon className="size-5" {...ic} /> },
  { href: "/jadwal", label: "Jadwal", icon: <CalendarClockIcon className="size-5" {...ic} /> },
  { href: "/import", label: "Input", icon: <SquarePenIcon className="size-5" {...ic} /> },
];

function Brand() {
  return (
    <div>
      <div className="font-serif text-[18px] leading-tight font-semibold text-ink">
        Buku Besar Risiko
      </div>
      <div className="text-caption text-ink-subtle">Monitoring Aset 2027</div>
    </div>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen lg:pl-56">
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:border focus:border-ink focus:bg-surface-raised focus:px-3 focus:py-2 focus:text-body focus:text-ink"
      >
        Lewati ke konten utama
      </a>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r border-rule bg-surface lg:flex">
        <div className="border-b border-rule px-4 py-5">
          <Brand />
        </div>
        <nav aria-label="Navigasi utama" className="flex-1 overflow-y-auto py-3">
          <ul>
            {SIDE.map((n) => (
              <li key={n.href}>
                <NavLink href={n.href} icon={n.icon} variant="side">
                  {n.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center justify-between gap-2 border-t border-rule px-4 py-3">
          <Suspense fallback={null}>
            <UserMenu />
          </Suspense>
          <ThemeToggle />
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-rule bg-surface px-4 lg:hidden">
        <span className="font-serif text-[16px] font-semibold text-ink">Buku Besar Risiko</span>
        <div className="flex items-center gap-1">
          <Suspense fallback={null}>
            <UserMenu />
          </Suspense>
          <ThemeToggle />
        </div>
      </header>

      <main
        id="konten"
        tabIndex={-1}
        className="mx-auto w-full max-w-6xl px-4 py-6 pb-[calc(5rem+env(safe-area-inset-bottom))] outline-none sm:px-6 lg:px-8 lg:py-8 lg:pb-8"
      >
        <Suspense fallback={null}>
          <AllowlistGate>{children}</AllowlistGate>
        </Suspense>
      </main>

      <nav
        aria-label="Navigasi bawah"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <ul className="flex">
          {BOTTOM.map((n) => (
            <li key={n.label} className="flex min-w-0 flex-1">
              <NavLink href={n.href} icon={n.icon} variant="bottom">
                {n.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
