import { UserIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export async function UserMenu() {
  if (!getSupabaseEnv()) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return null;
  const { data: role } = await supabase.rpc("current_app_role");
  const meta = (claims.user_metadata ?? {}) as { full_name?: string; name?: string };
  const nama = meta.full_name ?? meta.name ?? claims.email ?? "Pengguna";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Menu pengguna, ${nama}`}
        className="flex min-h-9 max-w-40 items-center gap-2 px-2 text-label text-ink-muted hover:text-ink"
      >
        <UserIcon className="size-4 shrink-0" aria-hidden strokeWidth={1.5} />
        <span className="truncate">{nama}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="space-y-0.5 font-normal">
          <div className="truncate text-body text-ink">{nama}</div>
          <div className="truncate text-caption text-ink-subtle">{claims.email}</div>
          <div className="text-caption text-ink-subtle">Peran: {role ?? "tidak ada"}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <form method="post" action="/auth/keluar" className="p-1">
          <button type="submit" className="w-full px-2 py-1.5 text-left text-body text-ink hover:bg-surface-sunken">
            Keluar
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
