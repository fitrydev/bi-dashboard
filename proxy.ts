import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Semua path lewat proxy kecuali bundle Next dan favicon. Tidak ada
     * pengecualian per ekstensi: path "*.png" dsb. tetap butuh sesi.
     */
    "/((?!_next/static|_next/image|favicon.ico$).*)",
  ],
};
