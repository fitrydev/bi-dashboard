/** Fungsi murni untuk riwayat perubahan (audit_log). */
export type AuditAction = "INSERT" | "UPDATE" | "DELETE";
type Rec = Record<string, unknown> | null | undefined;

const LABEL: Record<string, string> = {
  name: "Nama", type: "Jenis", region_id: "Wilayah", address: "Alamat",
  land_area_m2: "Luas tanah", building_area_m2: "Luas bangunan", book_value: "Nilai buku",
  legal_status: "Status hak", right_expiry_date: "Masa berlaku hak", utilization: "Pemanfaatan",
  utilization_raw: "Pemanfaatan (asli)", pic_unit: "PIC", notes: "Catatan",
  last_monitored_at: "Monitoring terakhir", is_active: "Status aktif", asset_code: "Kode aset",
  assessed_at: "Tanggal penilaian", critical_override: "Override critical", override_reason: "Alasan override",
  findings: "Temuan", follow_up: "Tindak lanjut", follow_up_pic: "PIC tindak lanjut", target_date: "Target selesai",
  s_legal: "Skor legalitas", s_control: "Skor penguasaan", s_physical: "Skor fisik",
  s_utilization: "Skor pemanfaatan", s_location: "Skor lokasi", s_strategic: "Skor strategis",
  total_score: "Skor total", category: "Kategori", params_version: "Versi parameter",
};
// kolom turunan/teknis: tidak informatif sebagai "perubahan"
const SKIP = new Set(["updated_at", "updated_by", "created_at", "created_by", "is_complete", "id", "value_is_placeholder", "area_is_placeholder", "utilization_needs_review"]);

export const columnLabel = (c: string): string => LABEL[c] ?? c;

/** Nama kolom (berlabel) yang berubah. INSERT/DELETE: tak ada daftar (kosong). */
export function changedColumns(action: AuditAction, before: Rec, after: Rec): string[] {
  if (action !== "UPDATE" || !before || !after) return [];
  return [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter((k) => !SKIP.has(k) && JSON.stringify(before[k] ?? null) !== JSON.stringify(after[k] ?? null))
    .map(columnLabel);
}

export const AKSI: Record<AuditAction, string> = { INSERT: "Dibuat", UPDATE: "Diubah", DELETE: "Dihapus" };

/** Ringkasan satu baris audit untuk tabel: objek (aset/penilaian) + aksi. */
export const auditSubject = (table: string): string => (table === "assessments" ? "Penilaian" : "Aset");
