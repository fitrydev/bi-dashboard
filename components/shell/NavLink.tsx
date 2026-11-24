"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Tautan navigasi dengan aria-current="page" untuk rute aktif (termasuk anak rutenya). */
type Props = { href: string; icon: ReactNode; children: ReactNode; variant: "side" | "bottom" };

// usePathname() pada rute dinamis (/aset/[id]) menunggu param; dengan cacheComponents harus dibungkus
// Suspense. Fallback = tautan yang sama tanpa penanda aktif, jadi shell tetap bisa diprerender.
export function NavLink(props: Props) {
  return (
    <Suspense fallback={<NavLinkView {...props} active={false} />}>
      <NavLinkActive {...props} />
    </Suspense>
  );
}

function NavLinkActive(props: Props) {
  const pathname = usePathname();
  const active = pathname === props.href || pathname.startsWith(`${props.href}/`);
  return <NavLinkView {...props} active={active} />;
}

function NavLinkView({ href, icon, children, variant, active }: Props & { active: boolean }) {
  return (
    <Link
      href={href}
      // /import menarik SheetJS (±120 KB gz): jangan prefetch di viewport, cukup saat hover/tap.
      prefetch={href === "/import" ? false : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
        variant === "side" &&
          "flex min-h-11 items-center gap-3 border-l-2 px-4 text-body text-ink-muted hover:bg-surface-sunken hover:text-ink",
        variant === "side" && (active ? "border-ink font-semibold text-ink" : "border-transparent"),
        variant === "bottom" &&
          "flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-caption text-ink-muted",
        variant === "bottom" &&
          active &&
          "font-semibold text-ink shadow-[inset_0_2px_0_var(--ink)]",
      )}
    >
      {icon}
      <span className="truncate">{children}</span>
    </Link>
  );
}
