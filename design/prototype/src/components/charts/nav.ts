import { useCallback } from "react";
export function useRouter() {
  return useCallback((kategori: string) => { window.location.hash = `#/aset?kategori=${kategori}`; }, []);
}
