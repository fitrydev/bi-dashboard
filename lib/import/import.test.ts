// @vitest-environment node
import { readFileSync } from "node:fs";
import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";

import { diffRows } from "./diff";
import { parseWorkbook, type ParsedWorkbook } from "./parse";
import {
  normCode,
  parseDate,
  toPayload,
  validateRows,
  type RowResult,
  type ValidateCtx,
} from "./validate";

// ctx = data seed (scripts/gen-seed.ts)
const ctx: ValidateCtx = {
  regions: ["BANTEN", "DKI JAKARTA", "JAWA BARAT"],
  regionAliases: { JABAR: "JAWA BARAT", DKI: "DKI JAKARTA", JAKARTA: "DKI JAKARTA" },
  utilizationAliases: {
    "digunakan sendiri": { status: "digunakan_sendiri", needs_review: false },
    "disewakan/kerja sama": { status: "disewakan_kerja_sama", needs_review: false },
    "idle/kosong": { status: "idle_kosong", needs_review: false },
    "digunakan pihak lain": { status: "digunakan_pihak_lain", needs_review: false },
    lainnya: { status: "lainnya", needs_review: false },
    idle: { status: "idle_kosong", needs_review: false },
    produktif: { status: "digunakan_sendiri", needs_review: true },
  },
  today: "2026-11-23",
};

const toAB = (b: Uint8Array) =>
  b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
const ok = (p: ParsedWorkbook) => {
  if (!p.ok) throw new Error(p.error.message);
  return p;
};
const has = (r: RowResult, code: string) => r.issues.some((i) => i.code === code);

/** Workbook kecil buatan dengan baris judul di baris 4 seperti template. */
function book(master: unknown[][], penilaian: unknown[][] = []): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  const mh = [
    "ID Aset",
    "Nama Aset",
    "Jenis Aset (Tanah/Bangunan/Gabungan)",
    "Distrik/Daerah",
    "Alamat/Lokasi",
    "Luas Tanah (m²)",
    "Luas Bangunan (m²)",
    "Nilai Buku/Estimasi (Rp)",
    "Status Hak/Legalitas",
    "Tanggal Akhir Hak",
    "Status Pemanfaatan",
    "Tanggal Monitoring Terakhir",
    "PIC/Unit Pengelola",
    "Catatan",
  ];
  const ph = [
    "ID Aset",
    "Nama Aset (otomatis)",
    "Jenis (otomatis)",
    "Distrik (otomatis)",
    "Tanggal Penilaian",
    "Legalitas (1-5)",
    "Penguasaan (1-5)",
    "Kondisi Fisik (1-5)",
    "Pemanfaatan (1-5)",
    "Lokasi (1-5)",
    "Nilai Strategis (1-5)",
    "Skor Total (0-100)",
    "Critical Override? (YA/TIDAK)",
    "Kategori Akhir",
    "Frekuensi Usulan",
    "Metode Usulan",
    "Kelengkapan Data",
    "Catatan Temuan/Dasar Skor",
    "Tindak Lanjut",
    "PIC Tindak Lanjut",
    "Target Selesai",
    "Alasan Override", // kolom opsional tambahan
  ];
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([["MASTER"], [], [], mh.map((h) => ` ${h.toUpperCase()} `), ...master]),
    "Master Aset",
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([["PENILAIAN"], [], [], ph, ...penilaian]),
    "Penilaian Risiko",
  );
  return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}
const row = (
  o: Partial<
    Record<"id" | "name" | "type" | "region" | "area" | "value" | "util" | "exp" | "mon", unknown>
  >,
) => [
  o.id ?? "A-1",
  o.name ?? "Gedung",
  o.type ?? "Bangunan",
  o.region ?? "BANTEN",
  "Jl. X",
  o.area ?? 100,
  null,
  o.value ?? 1000,
  "Clean dan Clear",
  o.exp ?? null,
  o.util ?? "Digunakan sendiri",
  o.mon ?? null,
  "PIC",
  null,
];

describe("file Excel asli", () => {
  const parsed = ok(
    parseWorkbook(toAB(readFileSync("source/Template_Matriks_Risiko_Monitoring_Aset_2027.xlsx"))),
  );
  const res = validateRows(parsed, ctx);
  const assets = res.filter((r) => r.kind === "asset");
  const count = (code: string) => assets.filter((r) => has(r, code)).length;

  it("136 aset, 1 penilaian, tanpa baris ditolak", () => {
    expect(assets).toHaveLength(136);
    expect(new Set(assets.map((a) => a.asset_code)).size).toBe(136);
    expect(res.filter((r) => r.status === "rejected")).toEqual([]);
    expect(toPayload(res)).toHaveLength(137);
  });

  it("peringatan data D1/D4/D5 + alias sesuai PLAN §2.3–2.4", () => {
    expect(count("nilai-placeholder")).toBe(44);
    expect(count("luas-placeholder")).toBe(39);
    expect(count("tgl-masa-depan")).toBe(136); // semua 31-12-2026
    expect(count("perlu-review")).toBe(123); // "Produktif"
    expect(assets.filter((a) => a.resolved?.utilization === "idle_kosong")).toHaveLength(13);
    expect(
      assets.filter((a) => has(a, "alias") && a.issues.some((i) => i.field === "utilization")),
    ).toHaveLength(11); // "Idle"
    expect(count("alamat-kosong")).toBe(4);
    expect(count("status-hak-kontradiksi")).toBe(3); // D2: "Clean dan Clear" padahal hak berakhir
    expect(assets.every((a) => a.status !== "ok")).toBe(true);
  });

  it("temuan risiko D2: 3 hak lewat + 1 < 12 bulan (finding, bukan error)", () => {
    const exp = assets.filter((a) => has(a, "hak-kedaluwarsa"));
    expect(
      exp.map((a) => a.payload?.kind === "asset" && a.payload.data.right_expiry_date).sort(),
    ).toEqual(["2010-09-11", "2024-02-26", "2024-09-24"]);
    expect(
      exp.every((a) => a.issues.find((i) => i.code === "hak-kedaluwarsa")?.level === "finding"),
    ).toBe(true);
    expect(assets.filter((a) => has(a, "hak-berakhir")).map((a) => a.asset_code)).toEqual([
      "251116",
    ]);
  });

  it("payload aset: ID string, tanggal ISO, kunci kosong tidak ada", () => {
    const a = assets.find((x) => x.asset_code === "251116")!.payload!;
    expect(a).toMatchObject({ kind: "asset", row: 5 });
    expect(a.data).toMatchObject({
      asset_code: "251116",
      type: "tanah",
      region: "BANTEN",
      right_expiry_date: "2027-09-10",
      last_monitored_at: "2026-12-31",
      book_value: 1,
      utilization: "Idle/Kosong",
    });
    expect(a.data).not.toHaveProperty("building_area_m2");
    expect(a.data).not.toHaveProperty("notes");
  });

  it("penilaian 251116 sesuai seed; baris formula kosong diabaikan", () => {
    const s = res.filter((r) => r.kind === "assessment");
    expect(s).toHaveLength(1);
    expect(s[0].status).toBe("warning"); // skor fisik 4 tanpa catatan
    expect(s[0].payload).toEqual({
      kind: "assessment",
      row: 5,
      data: {
        asset_code: "251116",
        assessed_at: "2026-11-18",
        s_legal: 1,
        s_control: 2,
        s_physical: 4,
        s_utilization: 3,
        s_location: 3,
        s_strategic: 2,
        critical_override: false,
      },
    });
  });
});

describe("parse", () => {
  it("sheet wajib tak ada → error terstruktur", () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["x"]]), "Master Aset");
    const r = parseWorkbook(XLSX.write(wb, { type: "array", bookType: "xlsx" }));
    expect(r).toEqual({
      ok: false,
      error: { code: "sheet_missing", message: "Sheet wajib tidak ditemukan: Penilaian Risiko." },
    });
  });
  it("bukan Excel → unreadable/header_missing, tidak throw", () => {
    const r = parseWorkbook(new TextEncoder().encode("bukan excel").buffer as ArrayBuffer);
    expect(r.ok).toBe(false);
  });
  it("header toleran kapital/spasi; nomor baris Excel asli", () => {
    const p = ok(parseWorkbook(book([row({}), [], row({ id: "A-2" })])));
    expect(p.assets.map((a) => a.row)).toEqual([5, 7]);
  });
});

describe("normalisasi", () => {
  it("tanggal: serial, dd/mm/yyyy, d/m/yyyy, ISO, invalid", () => {
    expect(parseDate(46387)).toBe("2026-12-31");
    expect(parseDate(46387.75)).toBe("2026-12-31");
    expect(parseDate(61)).toBe("1900-03-01"); // bug kabisat 1900
    expect(parseDate(60)).toBeNull(); // 29-02-1900 fiktif
    expect(parseDate(0, true)).toBeNull();
    expect(parseDate(1, true)).toBe("1904-01-02");
    expect(parseDate("10/09/2027")).toBe("2027-09-10");
    expect(parseDate("1/2/2024")).toBe("2024-02-01");
    expect(parseDate("2024-02-29")).toBe("2024-02-29");
    expect(parseDate("2024-02-29T00:00:00Z")).toBe("2024-02-29");
    for (const bad of ["31/02/2024", "2023-02-29", "besok", "13/13/2024"])
      expect(parseDate(bad)).toBeNull();
    expect(parseDate(undefined)).toBeUndefined();
  });
  it("ID: angka → string tanpa .0/separator", () => {
    expect(normCode(136)).toBe("136");
    expect(normCode(" 136 ")).toBe("136");
    expect(normCode(251116.0)).toBe("251116");
    expect(normCode("251116.0")).toBe("251116");
    expect(normCode("251.116")).toBe("251116");
    expect(normCode("A-1")).toBe("A-1");
    expect(normCode(1.5)).toBeNull();
    expect(normCode(-3)).toBeNull();
    expect(normCode("a b")).toBeNull();
    expect(normCode("  ")).toBeUndefined();
  });
});

describe("validasi", () => {
  const run = (master: unknown[][], pen: unknown[][] = [], c: Partial<ValidateCtx> = {}) =>
    validateRows(ok(parseWorkbook(book(master, pen))), { ...ctx, ...c });

  it("wilayah: alias → warning, tak dikenal → ditolak", () => {
    const [a, b] = run([row({ region: "jabar" }), row({ id: "A-2", region: "Sumatra" })]);
    expect(a.status).toBe("warning");
    expect(a.resolved?.region).toBe("JAWA BARAT");
    expect(a.payload?.data).toMatchObject({ region: "jabar" }); // mentah, DB yang resolve
    expect(b.status).toBe("rejected");
    expect(has(b, "wilayah-tidak-dikenal")).toBe(true);
    expect(b.payload).toBeUndefined();
  });

  it("aturan tolak: jenis, pemanfaatan, negatif, tanggal, ID duplikat, aset baru tanpa nama", () => {
    const r = run([
      row({ type: "Rumah" }),
      row({ id: "A-2", util: "Dijual" }),
      row({ id: "A-3", value: -5 }),
      row({ id: "A-4", exp: "31/02/2024" }),
      row({ id: "A-5" }),
      row({ id: "A-5" }),
      [null, "Tanpa ID"],
      ["A-7", null, "Tanah", "BANTEN"],
    ]);
    expect(r.map((x) => x.status)).toEqual([
      "rejected",
      "rejected",
      "rejected",
      "rejected",
      "ok",
      "rejected",
      "rejected",
      "rejected",
    ]);
    expect(has(r[5], "id-duplikat")).toBe(true);
    expect(r[7].issues[0].message).toContain("nama");
  });

  it("aset yang sudah ada: boleh parsial tanpa nama/jenis/wilayah", () => {
    const [a] = run([["A-9", null, null, null, null, 250]], [], {
      existingAssetCodes: new Set(["A-9"]),
    });
    expect(a.status).toBe("ok");
    expect(a.payload?.data).toEqual({ asset_code: "A-9", land_area_m2: 250 });
  });

  it("teks melebihi batas zod → ditolak", () => {
    const [a] = run([row({ name: "x".repeat(301) })]);
    expect(has(a, "teks-terlalu-panjang")).toBe(true);
  });

  it("penilaian: skor kosong ≠ 1, skor salah, tanpa tanggal, masa depan, ID tak dikenal, override", () => {
    const P = (
      id: unknown,
      date: unknown,
      scores: unknown[],
      ov: unknown = null,
      note: unknown = null,
    ) => [id, "", "", "", date, ...scores, "", ov, "", "", "", "", note];
    const r = run(
      [row({})],
      [
        P("A-1", "2026-11-01", [2, null, null, null, null, null]),
        P("A-1", "2026-11-02", [6, 2.5, null, null, null, null]),
        P("A-1", null, [1, null, null, null, null, null]),
        P("A-1", "2026-11-24", [1, null, null, null, null, null]),
        P("Z-1", "2026-11-01", [1, null, null, null, null, null]),
        P("A-1", "2026-11-03", [5, null, null, null, null, null], "YA"),
        P("A-1", "2026-11-04", [5, null, null, null, null, null], "ya", "sengketa"),
        P("A-1", "2026-11-01", [3, null, null, null, null, null]),
      ],
    ).filter((x) => x.kind === "assessment");
    expect(r[0].payload?.data).toEqual({
      asset_code: "A-1",
      assessed_at: "2026-11-01",
      s_legal: 2,
    });
    expect(r.slice(1, 6).map((x) => x.issues.find((i) => i.level === "error")?.code)).toEqual([
      "skor-tidak-valid",
      "wajib",
      "tanggal-masa-depan",
      "aset-tidak-ada",
      "override-tanpa-catatan",
    ]);
    expect(r[6].status).toBe("ok");
    expect(r[6].payload?.data).toMatchObject({
      critical_override: true,
      override_reason: "sengketa",
      findings: "sengketa",
    });
    expect(has(r[7], "penilaian-duplikat")).toBe(true);
  });
});

describe("perbaikan review", () => {
  const run = (master: unknown[][], pen: unknown[][] = [], c: Partial<ValidateCtx> = {}) =>
    validateRows(ok(parseWorkbook(book(master, pen))), { ...ctx, ...c });
  const P = (date: string, ov: unknown, note: unknown, reason: unknown) =>
    ["A-1", "", "", "", date, 5, null, null, null, null, null, "", ov, "", "", "", "", note, "", "", "", reason];

  it("teks bebas multi-baris dipertahankan; diff vs DB yang sama → same", () => {
    const m = row({});
    m[4] = "Jl. X\r\nRT 1  RW 2"; // alamat
    m[13] = "baris 1\nbaris 2"; // catatan
    const [a] = run([m]);
    expect(a.payload?.data).toMatchObject({ address: "Jl. X\nRT 1  RW 2", notes: "baris 1\nbaris 2" });
    const d = diffRows([a], {
      assets: new Map([["A-1", { ...a.payload!.data, region: "BANTEN" }]]),
      assessments: new Map(),
    });
    expect(d[0].diff).toBe("same");
    const d2 = diffRows([a], {
      assets: new Map([["A-1", { ...a.payload!.data, notes: "baris 1 baris 2", region: "BANTEN" }]]),
      assessments: new Map(),
    });
    expect(d2[0].changes.map((c) => c.field)).toEqual(["notes"]);
  });

  it("kolom Alasan Override dipakai bila ada; tanpa alasan & catatan → ditolak", () => {
    const r = run(
      [row({})],
      [P("2026-11-01", "YA", "catatan temuan", "alasan khusus"), P("2026-11-02", "YA", null, null), P("2026-11-03", "YA", "dari catatan", null)],
    ).filter((x) => x.kind === "assessment");
    expect(r[0].payload?.data).toMatchObject({ critical_override: true, override_reason: "alasan khusus", findings: "catatan temuan" });
    expect(r[1].status).toBe("rejected");
    expect(r[2].payload?.data).toMatchObject({ override_reason: "dari catatan" });
  });

  it("__proto__/constructor bukan alias pemanfaatan/wilayah", () => {
    const r = run([row({ util: "__proto__" }), row({ id: "A-2", util: "constructor" }), row({ id: "A-3", region: "__proto__" })]);
    expect(r.map((x) => x.status)).toEqual(["rejected", "rejected", "rejected"]);
  });

  it("aset nonaktif → aset & penilaian ditolak", () => {
    const r = run([row({})], [P("2026-11-01", "TIDAK", "x", null)], {
      existingAssetCodes: new Set(["A-1"]),
      inactiveAssetCodes: new Set(["A-1"]),
    });
    expect(r.map((x) => x.status)).toEqual(["rejected", "rejected"]);
    expect(r.every((x) => x.issues.some((i) => i.message === "Aset nonaktif; pulihkan dulu."))).toBe(true);
  });
});

describe("diffRows", () => {
  it("new / changed / same, hanya kunci di payload, angka & alias dinormalisasi", () => {
    const res = validateRows(
      ok(
        parseWorkbook(
          book([
            row({ id: "N" }),
            row({ id: "C", value: 2000 }),
            row({ id: "S", region: "JABAR" }),
          ]),
        ),
      ),
      ctx,
    );
    const base = {
      name: "Gedung",
      type: "bangunan",
      address: " Jl. X ", // teks bebas: hanya trim
      land_area_m2: "100.00",
      legal_status: "Clean dan Clear",
      utilization: "Digunakan sendiri",
      pic_unit: "PIC",
      notes: "lama",
    };
    const d = diffRows(res, {
      assets: new Map([
        ["C", { ...base, region: "BANTEN", book_value: 1000 }],
        ["S", { ...base, region: "JAWA BARAT", book_value: "1000" }],
      ]),
      assessments: new Map(),
    });
    expect(d.map((x) => x.diff)).toEqual(["new", "changed", "same"]);
    expect(d[1].changes).toEqual([{ field: "book_value", before: 1000, after: 2000 }]);
  });
  it("penilaian dikunci (kode, tanggal); baris ditolak → null", () => {
    const P = (date: string, s: number) => ["A-1", "", "", "", date, s];
    const res = validateRows(
      ok(
        parseWorkbook(
          book([row({}), row({ type: "x", id: "B" })], [P("2026-11-01", 3), P("2026-11-02", 3)]),
        ),
      ),
      ctx,
    );
    const d = diffRows(res, {
      assets: new Map(),
      assessments: new Map([["A-1|2026-11-01", { s_legal: 3, critical_override: false }]]),
    });
    expect(d.map((x) => x.diff)).toEqual(["new", null, "same", "new"]);
  });
});
