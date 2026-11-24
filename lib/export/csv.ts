// CSV RFC 4180 untuk Excel id-ID. Murni.
// Pemisah ";" — Excel berlokal Indonesia memakai ";" sebagai pemisah daftar (koma = desimal), jadi
// "," akan membuka semua kolom jadi satu. BOM UTF-8 agar karakter (m², é) terbaca benar.
export type CsvCell = string | number | boolean | null | undefined;
export type CsvColumn<R> = { header: string; get: (r: R) => CsvCell };

export const CSV_SEP = ";";

/** Netralkan teks yang akan dibaca spreadsheet sebagai formula (=,+,-,@ setelah spasi/kutip, atau awalan tab/CR/LF). */
export const neutralize = (s: string) => (/^[\s'"]*[=+\-@]|^[\t\r\n]/.test(s) ? `'${s}` : s);

function cell(v: CsvCell): string {
  if (v == null) return "";
  // Hanya teks yang dinetralkan; angka (termasuk negatif) dibiarkan.
  const s = typeof v === "string" ? neutralize(v) : String(v);
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv<R>(rows: R[], columns: CsvColumn<R>[]): string {
  const line = (c: CsvCell[]) => c.map(cell).join(CSV_SEP);
  return "﻿" + [line(columns.map((c) => c.header)), ...rows.map((r) => line(columns.map((c) => c.get(r))))].join("\r\n") + "\r\n";
}
