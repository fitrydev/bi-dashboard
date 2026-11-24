const PAGE = 1000; // = max_rows PostgREST (supabase/config.toml)

/** Ambil semua baris melewati batas max_rows PostgREST. fetchPage harus berurutan stabil (order by unik). */
export async function fetchAll<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  what: string,
): Promise<T[]> {
  const out: T[] = [];
  // ponytail: plafon 20.000 baris (20 halaman); naikkan bila data tumbuh melewatinya.
  for (let from = 0; from < 20000; from += PAGE) {
    const { data, error } = await fetchPage(from, from + PAGE - 1);
    if (error) throw new Error(`Gagal memuat ${what}: ${error.message}`);
    out.push(...(data ?? []));
    if ((data?.length ?? 0) < PAGE) break;
  }
  return out;
}
