import type { IndicatorKey, RiskLevel } from "./types";

export const SHORT_LABEL: Record<IndicatorKey, string> = {
  legal: "Legalitas",
  control: "Penguasaan",
  physical: "Fisik",
  utilization: "Pemanfaatan",
  location: "Lokasi",
  strategic: "Strategis",
};

export const RISK_LABEL: Record<RiskLevel, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
  unrated: "Belum dinilai",
};

export const LEVELS: RiskLevel[] = ["critical", "high", "medium", "low", "unrated"];

export type WarnKey =
  | "nilai-placeholder"
  | "luas-placeholder"
  | "hak-kedaluwarsa"
  | "hak-berakhir"
  | "tgl-masa-depan"
  | "perlu-review"
  | "alamat-kosong";

export const WARN_LABEL: Record<WarnKey, string> = {
  "nilai-placeholder": "Nilai buku placeholder (Rp1)",
  "luas-placeholder": "Luas placeholder (1 m²)",
  "hak-kedaluwarsa": "Hak tanah sudah lewat masa berlaku",
  "hak-berakhir": "Hak tanah berakhir kurang dari 12 bulan",
  "tgl-masa-depan": "Tanggal monitoring di masa depan",
  "perlu-review": 'Status "Produktif" perlu review',
  "alamat-kosong": "Alamat kosong",
};
