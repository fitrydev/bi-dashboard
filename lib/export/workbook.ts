// Bangun workbook "format template" (Master Aset + Penilaian Risiko) yang bisa dibaca ulang oleh
// lib/import/parse.ts. Murni (tanpa I/O).
import * as XLSX from "xlsx";

export type ExportRow = {
  asset_code: string;
  name: string;
  type: "tanah" | "bangunan" | "gabungan";
  region: string; // nama kanonik
  address: string | null;
  land_area_m2: number | null;
  building_area_m2: number | null;
  book_value: number | null;
  legal_status: string | null;
  right_expiry_date: string | null; // YYYY-MM-DD
  utilization: string | null; // enum DB
  utilization_raw: string | null;
  last_monitored_at: string | null;
  pic_unit: string | null;
  notes: string | null;
  // penilaian terakhir (assessed_at null = belum pernah dinilai)
  assessed_at: string | null;
  s_legal: number | null;
  s_control: number | null;
  s_physical: number | null;
  s_utilization: number | null;
  s_location: number | null;
  s_strategic: number | null;
  total_score: number | null;
  category: string | null;
  critical_override: boolean | null;
  override_reason: string | null;
  findings: string | null;
  follow_up: string | null;
  follow_up_pic: string | null;
  target_date: string | null;
};

export const MASTER_HEADERS = [
  "ID Aset", "Nama Aset", "Jenis Aset (Tanah/Bangunan/Gabungan)", "Distrik/Daerah", "Alamat/Lokasi",
  "Luas Tanah (m²)", "Luas Bangunan (m²)", "Nilai Buku/Estimasi (Rp)", "Status Hak/Legalitas",
  "Tanggal Akhir Hak", "Status Pemanfaatan", "Tanggal Monitoring Terakhir", "PIC/Unit Pengelola", "Catatan",
];
export const ASSESSMENT_HEADERS = [
  "ID Aset", "Nama Aset (otomatis)", "Jenis (otomatis)", "Distrik (otomatis)", "Tanggal Penilaian",
  "Legalitas (1-5)", "Penguasaan (1-5)", "Kondisi Fisik (1-5)", "Pemanfaatan (1-5)", "Lokasi (1-5)",
  "Nilai Strategis (1-5)", "Skor Total (0-100)", "Critical Override? (YA/TIDAK)", "Kategori Akhir",
  "Frekuensi Usulan", "Metode Usulan", "Kelengkapan Data", "Catatan Temuan/Dasar Skor",
  "Tindak Lanjut", "PIC Tindak Lanjut", "Target Selesai",
  "Alasan Override", // kolom tambahan (bukan template asli); impor memakainya bila ada
];

export const UTIL_LABEL: Record<string, string> = {
  digunakan_sendiri: "Digunakan sendiri",
  disewakan_kerja_sama: "Disewakan/Kerja sama",
  idle_kosong: "Idle/Kosong",
  digunakan_pihak_lain: "Digunakan pihak lain",
  lainnya: "Lainnya",
};
const TYPE_LABEL = { tanah: "Tanah", bangunan: "Bangunan", gabungan: "Gabungan" } as const;
const CAT_LABEL: Record<string, string> = { critical: "Critical", high: "High", medium: "Medium", low: "Low" };

type C = XLSX.CellObject | undefined;
// Teks selalu t:"s" dan tidak pernah punya `f` → Excel tidak menjalankannya sebagai formula.
const str = (v: string | null | undefined): C => (v ? { t: "s", v } : undefined);
const num = (v: number | null | undefined): C => (v == null ? undefined : { t: "n", v });
const DATE_FMT = "dd/mm/yyyy";
// Serial Excel (sistem 1900) untuk tanggal ≥ 1900-03-01.
const date = (iso: string | null | undefined): C =>
  iso ? { t: "n", v: Math.round(Date.parse(`${iso}T00:00:00Z`) / 864e5) + 25569, z: DATE_FMT } : undefined;
const code = (v: string): C => (/^[1-9]\d{0,14}$/.test(v) ? { t: "n", v: Number(v), z: "0" } : { t: "s", v });

function sheet(title: string, headers: string[], rows: C[][]): XLSX.WorkSheet {
  const ws = XLSX.utils.aoa_to_sheet([[title], [], [], headers, ...rows]);
  ws["!cols"] = headers.map((h) => ({ wch: Math.min(Math.max(h.length, 14), 40) }));
  return ws;
}

export function buildWorkbook(data: ExportRow[], opts: { empty?: boolean } = {}): ArrayBuffer {
  const rows = opts.empty ? [] : data;
  const master = rows.map((r): C[] => [
    code(r.asset_code), str(r.name), str(TYPE_LABEL[r.type]), str(r.region), str(r.address),
    num(r.land_area_m2), num(r.building_area_m2), num(r.book_value), str(r.legal_status),
    date(r.right_expiry_date),
    // utilization_raw asli dipertahankan agar alias "Produktif" tetap perlu-review saat impor ulang.
    str(r.utilization_raw ?? (r.utilization ? UTIL_LABEL[r.utilization] : null)),
    date(r.last_monitored_at), str(r.pic_unit), str(r.notes),
  ]);
  const assess = rows
    .filter((r) => r.assessed_at)
    .map((r): C[] => [
      code(r.asset_code), str(r.name), str(TYPE_LABEL[r.type]), str(r.region), date(r.assessed_at),
      num(r.s_legal), num(r.s_control), num(r.s_physical), num(r.s_utilization), num(r.s_location),
      num(r.s_strategic), num(r.category ? r.total_score : null),
      { t: "s", v: r.critical_override ? "YA" : "TIDAK" },
      str(r.category ? CAT_LABEL[r.category] : null), undefined, undefined, undefined,
      str(r.findings),
      str(r.follow_up), str(r.follow_up_pic), date(r.target_date), str(r.override_reason),
    ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet("MASTER DATA ASET", MASTER_HEADERS, master), "Master Aset");
  XLSX.utils.book_append_sheet(wb, sheet("PENILAIAN RISIKO ASET", ASSESSMENT_HEADERS, assess), "Penilaian Risiko");
  return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}
