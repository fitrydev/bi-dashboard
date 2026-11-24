import { SettingsIcon } from "lucide-react";
import { NavLink } from "@/components/shell/NavLink";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

/** Item "Pengaturan" hanya untuk admin. Hanya kosmetik: halaman, action, dan RLS tetap menegakkan akses. */
export async function AdminNavItem() {
  if (!getSupabaseEnv()) return null;
  const supabase = await createClient();
  const { data } = await supabase.rpc("current_app_role");
  if (data !== "admin") return null;
  return (
    <li>
      <NavLink href="/pengaturan" icon={<SettingsIcon className="size-[18px]" aria-hidden strokeWidth={1.5} />} variant="side">
        Pengaturan
      </NavLink>
    </li>
  );
}
