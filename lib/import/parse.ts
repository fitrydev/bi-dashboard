// Baca workbook template (Master Aset + Penilaian Risiko) → baris mentah per kolom input.
// Murni (tanpa DOM) — dipakai di Web Worker (lib/import/worker.ts) dan test.
import * as XLSX from "xlsx";

import { IMPORT_MAX_BYTES, type ImportAssessmentData, type ImportAssetData } from "./contract";

export const MAX_ROWS_PER_SHEET = 5000;

export type Cell = string | number | boolean;
export type ParsedRow<F extends string> = {
  row: number; // nomor baris Excel asli (1-based)
  cells: Partial<Record<F, Cell>>; // sel kosong = kunci tidak ada
};
export type AssetField = keyof ImportAssetData;
export type AssessmentField = keyof ImportAssessmentData;

export type ParseError = {
  code: "file_too_large" | "unreadable" | "sheet_missing" | "header_missing" | "too_many_rows";
  message: string;
};
export type ParsedWorkbook =
  | {
      ok: true;
      date1904: boolean;
      assets: ParsedRow<AssetField>[];
      assessments: ParsedRow<AssessmentField>[];
    }
  | { ok: false; error: ParseError };

/** Header dinormalisasi: huruf kecil, spasi tunggal, "tgl" → "tanggal". */
const normHeader = (s: string) =>
  s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^tgl\b/, "tanggal");

// Dicocokkan dengan awalan header (setelah normHeader). Kolom formula (Penilaian B–D, L, N–Q)
// sengaja tidak dipetakan sehingga diabaikan.
const ASSET_COLS: [AssetField, string][] = [
  ["asset_code", "id aset"],
  ["name", "nama aset"],
  ["type", "jenis aset"],
  ["region", "distrik"],
  ["address", "alamat"],
  ["land_area_m2", "luas tanah"],
  ["building_area_m2", "luas bangunan"],
  ["book_value", "nilai buku"],
  ["legal_status", "status hak"],
  ["right_expiry_date", "tanggal akhir hak"],
  ["utilization", "status pemanfaatan"],
  ["last_monitored_at", "tanggal monitoring terakhir"],
  ["pic_unit", "pic"],
  ["notes", "catatan"],
];
const ASSESSMENT_COLS: [AssessmentField, string][] = [
  ["asset_code", "id aset"],
  ["assessed_at", "tanggal penilaian"],
  ["s_legal", "legalitas"],
  ["s_control", "penguasaan"],
  ["s_physical", "kondisi fisik"],
  ["s_utilization", "pemanfaatan"],
  ["s_location", "lokasi"],
  ["s_strategic", "nilai strategis"],
  ["critical_override", "critical override"],
  ["findings", "catatan"],
  ["follow_up", "tindak lanjut"],
  ["follow_up_pic", "pic tindak lanjut"],
  ["target_date", "target selesai"],
  ["override_reason", "alasan override"], // opsional, tidak ada di template asli
];

type DenseRow = (XLSX.CellObject | undefined)[] | undefined;

function cellValue(c: XLSX.CellObject | undefined): Cell | undefined {
  if (!c || c.t === "z" || c.v == null) return undefined;
  if (c.t === "e") return c.w ?? "#ERROR"; // sel error Excel (#N/A, …) → teks, ditolak validator bila bukan teks
  if (typeof c.v === "string" && c.v.trim() === "") return undefined;
  // cellDates tidak aktif → tanggal tetap serial number; Date hanya bila opsi baca diubah.
  return c.v instanceof Date ? c.v.toISOString().slice(0, 10) : c.v;
}

function readSheet<F extends string>(
  ws: XLSX.WorkSheet,
  sheet: string,
  cols: [F, string][],
  secondKey: string,
  skipIdOnly: boolean,
): { rows: ParsedRow<F>[] } | { error: ParseError } {
  const data = (ws["!data"] ?? []) as DenseRow[];
  const texts = (r: DenseRow) =>
    (r ?? []).map((c) => (c && typeof c.v === "string" ? normHeader(c.v) : ""));

  // Baris header: baris pertama (dalam 30 baris awal) yang memuat "ID Aset" + kolom kunci kedua.
  let headerIdx = -1;
  for (let i = 0; i < Math.min(data.length, 30) && headerIdx < 0; i++) {
    const t = texts(data[i]);
    if (t.some((h) => h.startsWith("id aset")) && t.some((h) => h.startsWith(secondKey)))
      headerIdx = i;
  }
  if (headerIdx < 0)
    return {
      error: {
        code: "header_missing",
        message: `Baris judul kolom di sheet "${sheet}" tidak ditemukan.`,
      },
    };

  const headers = texts(data[headerIdx]);
  const colIdx: [F, number][] = [];
  for (const [field, prefix] of cols) {
    const i = headers.findIndex((h) => h.startsWith(prefix));
    if (i >= 0) colIdx.push([field, i]);
  }

  const rows: ParsedRow<F>[] = [];
  for (let r = headerIdx + 1; r < data.length; r++) {
    const src = data[r];
    if (!src) continue;
    const cells: Partial<Record<F, Cell>> = {};
    let filled = 0;
    for (const [field, i] of colIdx) {
      const v = cellValue(src[i]);
      if (v === undefined) continue;
      cells[field] = v;
      // ID dan Override saja (mis. "TIDAK" bawaan template) belum dihitung sebagai baris berisi.
      if (field !== "asset_code" && field !== "critical_override") filled++;
    }
    // Baris kosong total dilewati. Penilaian: ID saja (hasil formula ='Master Aset'!A…, termasuk 0) = kosong.
    if (filled === 0 && (skipIdOnly || !("asset_code" in cells))) continue;
    if (rows.length >= MAX_ROWS_PER_SHEET)
      return {
        error: {
          code: "too_many_rows",
          message: `Sheet "${sheet}" melebihi ${MAX_ROWS_PER_SHEET.toLocaleString("id-ID")} baris.`,
        },
      };
    rows.push({ row: r + 1, cells });
  }
  return { rows };
}

export function parseWorkbook(buf: ArrayBuffer): ParsedWorkbook {
  if (buf.byteLength > IMPORT_MAX_BYTES)
    return {
      ok: false,
      error: { code: "file_too_large", message: "Ukuran berkas melebihi 5 MB." },
    };

  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buf, {
      type: "array",
      cellFormula: false,
      cellHTML: false,
      cellStyles: false,
      sheetStubs: false,
      dense: true,
    });
  } catch {
    return {
      ok: false,
      error: { code: "unreadable", message: "Berkas tidak dapat dibaca sebagai Excel." },
    };
  }

  const find = (name: string) => {
    const n = wb.SheetNames.find((s) => normHeader(s) === normHeader(name));
    return n ? wb.Sheets[n] : undefined;
  };
  const master = find("Master Aset");
  const penilaian = find("Penilaian Risiko");
  const missing = [!master && "Master Aset", !penilaian && "Penilaian Risiko"].filter(Boolean);
  if (!master || !penilaian)
    return {
      ok: false,
      error: {
        code: "sheet_missing",
        message: `Sheet wajib tidak ditemukan: ${missing.join(", ")}.`,
      },
    };

  const a = readSheet(master, "Master Aset", ASSET_COLS, "nama aset", false);
  if ("error" in a) return { ok: false, error: a.error };
  const s = readSheet(penilaian, "Penilaian Risiko", ASSESSMENT_COLS, "tanggal penilaian", true);
  if ("error" in s) return { ok: false, error: s.error };

  return {
    ok: true,
    date1904: !!wb.Workbook?.WBProps?.date1904,
    assets: a.rows,
    assessments: s.rows,
  };
}
