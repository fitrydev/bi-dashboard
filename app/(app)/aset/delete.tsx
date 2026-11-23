"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { restoreAsset, softDeleteAsset } from "@/lib/actions/assets";

type Wrap = (restore: () => Promise<void>) => void;

async function undoDelete(code: string) {
  const r = await restoreAsset(code);
  if (r.ok) toast("Penghapusan dibatalkan", { duration: 4000 });
  else toast.error(r.error);
}

/**
 * Hapus lunak + toast 8 detik "Urungkan" (DESIGN §6.10). `wrap` membungkus pemulihan,
 * mis. agar daftar bisa menambah baris secara optimistik dalam transition. Mengembalikan sukses/gagal.
 */
export async function deleteAset(code: string, name: string, wrap: Wrap = (f) => void f()): Promise<boolean> {
  const r = await softDeleteAsset(code);
  if (!r.ok) {
    toast.error(r.error);
    return false;
  }
  toast(`Aset ${name} dihapus`, {
    duration: 8000,
    action: { label: "Urungkan", onClick: () => wrap(() => undoDelete(code)) },
  });
  return true;
}

/** Tombol hapus untuk header detail aset (editor/admin saja; render bersyarat di server). */
export function DeleteAssetButton({ code, name }: { code: string; name: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          if (await deleteAset(code, name)) router.push("/aset");
        })
      }
    >
      <Trash2 aria-hidden="true" />
      Hapus aset
    </Button>
  );
}
