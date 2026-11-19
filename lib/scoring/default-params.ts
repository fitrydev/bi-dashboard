import type { ScoringParams } from "./types";

/** Salinan parameter versi 1 (dari ekstraksi Excel). Sumber kebenaran kelak tabel parameter berversi di Postgres. */
export const DEFAULT_PARAMS: ScoringParams = {
  version: 1,
  indicators: [
    {
      key: "legal",
      label: "Legalitas dan administrasi",
      weight: 0.2,
    },
    {
      key: "control",
      label: "Penguasaan dan pengamanan",
      weight: 0.25,
    },
    {
      key: "physical",
      label: "Kondisi fisik aset",
      weight: 0.15,
    },
    {
      key: "utilization",
      label: "Pemanfaatan aset",
      weight: 0.15,
    },
    {
      key: "location",
      label: "Lokasi dan kerawanan",
      weight: 0.1,
    },
    {
      key: "strategic",
      label: "Nilai dan kepentingan strategis",
      weight: 0.15,
    },
  ],
  thresholds: {
    critical: 80,
    high: 60,
    medium: 40,
  },
  categories: [
    {
      key: "critical",
      label: "Critical",
      interval_months: 1,
      frequency: "Segera; minimal bulanan setelah stabilisasi",
      method: "Site visit segera + remote follow-up",
      action: "Eskalasi dan rencana aksi prioritas",
    },
    {
      key: "high",
      label: "High",
      interval_months: 3,
      frequency: "Setiap 3 bulan",
      method: "Site visit triwulanan + remote",
      action: "Tindak lanjut temuan dan verifikasi",
    },
    {
      key: "medium",
      label: "Medium",
      interval_months: 6,
      frequency: "Setiap 6 bulan",
      method: "Remote triwulanan + site visit semesteran",
      action: "Pemeliharaan/penertiban terencana",
    },
    {
      key: "low",
      label: "Low",
      interval_months: 12,
      frequency: "Setiap 12 bulan",
      method: "Remote semesteran + site visit tahunan",
      action: "Monitoring rutin",
    },
  ],
};
