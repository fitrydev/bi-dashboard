// Validasi + normalisasi baris hasil parseWorkbook → status per baris (DESIGN §12.2: Ditolak /
// Peringatan data / Temuan risiko) + payload kontrak import_commit. Fungsi murni (tanpa I/O).
import * as XLSX from "xlsx";

import type { WarnKey } from "@/lib/scoring/labels";
import { assessmentInput } from "@/lib/schemas/assessment";
import { assetInput } from "@/lib/schemas/asset";
import { isoDate, optionalText } from "@/lib/schemas/date";
import { Constants, type Database } from "@/lib/supabase/database.types";

import type { ImportAssessmentData, ImportAssetData, ImportRow, RowStatus } from "./contract";
import type { AssessmentField, AssetField, Cell, ParsedRow, ParsedWorkbook } from "./parse";

type UtilStatus = Database["public"]["Enums"]["utilization_status"];

export type ValidateCtx = {
  regions: string[]; // nama wilayah (mis. "JAWA BARAT")
  regionAliases: Record<string, string>; // alias → nama
  utilizationAliases: Record<string, { status: UtilStatus; needs_review: boolean }>; // raw (huruf kecil) → status
  today: string; // YYYY-MM-DD WIB (todayJakarta())
  existingAssetCodes?: Set<string>;
  inactiveAssetCodes?: Set<string>; // aset nonaktif (soft delete) → baris ditolak
};

/** Kode isu: WarnKey (dipakai app/DB v_data_quality_issues) + kode khusus impor. */
export type IssueCode =
  | WarnKey
  | "alias"
  | "status-hak-kontradiksi"
  | "catatan-skor-tinggi"
  | "id-tidak-valid"
  | "id-duplikat"
  | "wajib"
  | "jenis-tidak-dikenal"
  | "wilayah-tidak-dikenal"
  | "pemanfaatan-tidak-dikenal"
  | "angka-tidak-valid"
  | "skor-tidak-valid"
  | "tanggal-tidak-valid"
  | "tanggal-masa-depan"
  | "aset-tidak-ada"
  | "override-tanpa-catatan"
  | "override-tidak-valid"
  | "teks-terlalu-panjang"
  | "penilaian-duplikat"
  | "aset-nonaktif";

export type Issue = {
  code: IssueCode;
  level: "error" | "warning" | "finding";
  field?: string;
  message: string;
};

export type RowResult = {
  kind: ImportRow["kind"];
  row: number;
  asset_code: string; // "" bila ID kosong/tak valid
  status: RowStatus;
  issues: Issue[];
  payload?: ImportRow; // hanya bila status ≠ rejected
  /** Hasil resolve untuk pratinjau/diff (DB tetap me-resolve sendiri dari teks mentah di payload). */
  resolved?: { region?: string; utilization?: UtilStatus; utilization_needs_review?: boolean };
};

// ---------- normalisasi ----------

/** Trim + collapse spasi (termasuk baris baru) — untuk kode/nama/wilayah/jenis/pemanfaatan. Kosong → undefined. */
export function normText(v: Cell | undefined): string | undefined {
  if (v === undefined) return undefined;
  const s = String(v).replace(/\s+/g, " ").trim();
  return s === "" ? undefined : s;
}

/** Teks bebas (alamat, catatan, …): hanya trim, baris baru dipertahankan (CRLF → LF seperti textarea form). */
export function freeText(v: Cell | undefined): string | undefined {
  if (v === undefined) return undefined;
  const s = String(v).replace(/\r\n?/g, "\n").trim();
  return s === "" ? undefined : s;
}

/** ID Aset → string kanonik. 251116 / 251116.0 / "251116.0" / "251.116" → "251116". null = tak valid. */
export function normCode(v: Cell | undefined): string | null | undefined {
  if (v === undefined) return undefined;
  if (typeof v === "number") return Number.isSafeInteger(v) && v > 0 ? String(v) : null;
  const s = normText(v);
  if (s === undefined) return undefined;
  if (/^\d+\.0+$/.test(s)) return s.replace(/\.0+$/, "");
  // ponytail: ID teks bergrup ribuan ("251.116"/"251,116") dianggap angka berseparator; kode alfanumerik
  // asli berbentuk sama akan tergabung. Hapus baris ini bila kode seperti "1.234" memang dipakai.
  if (/^\d{1,3}(\.\d{3})+$|^\d{1,3}(,\d{3})+$/.test(s)) return s.replace(/[.,]/g, "");
  return /^[A-Za-z0-9][A-Za-z0-9._/-]{0,63}$/.test(s) ? s : null;
}

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (y: number, m: number, d: number) =>
  `${String(y).padStart(4, "0")}-${pad(m)}-${pad(d)}`;
const realDate = (s: string) => (isoDate.safeParse(s).success ? s : null);

/**
 * Tanggal → YYYY-MM-DD. Terima serial Excel (via SSF, menangani bug kabisat 1900 & sistem 1904),
 * "dd/mm/yyyy", "d/m/yyyy", "dd-mm-yyyy", "dd.mm.yyyy", ISO "yyyy-mm-dd[T…]". null = tak bisa di-parse.
 */
export function parseDate(v: Cell | undefined, date1904 = false): string | null | undefined {
  if (v === undefined) return undefined;
  if (typeof v === "number") {
    if (!Number.isFinite(v) || v < 1 || v >= 2958466) return null; // 2958466 = 10000-01-01
    const p = XLSX.SSF.parse_date_code(Math.floor(v), { date1904 });
    return p ? realDate(ymd(p.y, p.m, p.d)) : null; // serial 60 (29-02-1900 fiktif) → null
  }
  const s = normText(v);
  if (s === undefined) return undefined;
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/.exec(s);
  if (m) return realDate(ymd(+m[1], +m[2], +m[3]));
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s);
  if (m) return realDate(ymd(+m[3], +m[2], +m[1]));
  return null;
}

/** Angka dari number atau string ("1234.5"). null = bukan angka. */
function toNumber(v: Cell): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string") return null;
  const s = v.trim();
  const n = s === "" ? NaN : Number(s);
  return Number.isFinite(n) ? n : null;
}

/** today + 12 bulan (setara `current_date + interval '12 months'` di Postgres). */
function plus12Months(today: string): string {
  const [y, md] = [Number(today.slice(0, 4)), today.slice(5)];
  return `${y + 1}-${md === "02-29" ? "02-28" : md}`;
}

// Label daftar validasi Excel (D5). Raw yang sama dengan label ini = bukan alias.
const EXCEL_UTIL_LABEL: Record<UtilStatus, string> = {
  digunakan_sendiri: "digunakan sendiri",
  disewakan_kerja_sama: "disewakan/kerja sama",
  idle_kosong: "idle/kosong",
  digunakan_pihak_lain: "digunakan pihak lain",
  lainnya: "lainnya",
};

const fmtDate = (s: string) => `${s.slice(8)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;

const S = assetInput.shape;
const A = assessmentInput.shape;
const ASSET_TEXT: [AssetField, { safeParse: (v: unknown) => { success: boolean } }, string][] = [
  ["name", S.name, "Nama aset"],
  ["address", S.address, "Alamat"],
  ["legal_status", S.legal_status, "Status hak"],
  ["pic_unit", S.pic_unit, "PIC/Unit"],
  ["notes", S.notes, "Catatan"],
];
const UTIL_RAW = optionalText(200);
const SCORE_FIELDS = [
  "s_legal",
  "s_control",
  "s_physical",
  "s_utilization",
  "s_location",
  "s_strategic",
] as const;
const SCORE_LABEL: Record<(typeof SCORE_FIELDS)[number], string> = {
  s_legal: "Legalitas",
  s_control: "Penguasaan",
  s_physical: "Kondisi fisik",
  s_utilization: "Pemanfaatan",
  s_location: "Lokasi",
  s_strategic: "Nilai strategis",
};

function statusOf(issues: Issue[]): RowStatus {
  if (issues.some((i) => i.level === "error")) return "rejected";
  if (issues.some((i) => i.level === "warning")) return "warning";
  if (issues.some((i) => i.level === "finding")) return "finding";
  return "ok";
}

// ---------- validasi ----------

function validateAsset(
  r: ParsedRow<AssetField>,
  ctx: ValidateCtx,
  seen: Set<string>,
  date1904: boolean,
): RowResult {
  const c = r.cells;
  const issues: Issue[] = [];
  const err = (code: IssueCode, message: string, field?: string) =>
    issues.push({ code, level: "error", field, message });
  const warn = (code: IssueCode, message: string, field?: string) =>
    issues.push({ code, level: "warning", field, message });

  const code = normCode(c.asset_code);
  if (!code) {
    err(
      code === undefined ? "wajib" : "id-tidak-valid",
      code === undefined ? "ID Aset kosong." : `ID Aset "${String(c.asset_code)}" tidak valid.`,
      "asset_code",
    );
  } else if (seen.has(code)) {
    err(
      "id-duplikat",
      `ID Aset ${code} muncul lebih dari sekali di file; baris ini dilewati.`,
      "asset_code",
    );
  }
  if (code) seen.add(code);

  const data: ImportAssetData = { asset_code: code ?? "" };
  const resolved: NonNullable<RowResult["resolved"]> = {};
  const isNew = !(code && ctx.existingAssetCodes?.has(code));

  if (code && ctx.inactiveAssetCodes?.has(code))
    err("aset-nonaktif", "Aset nonaktif; pulihkan dulu.", "asset_code");

  for (const [f, schema, label] of ASSET_TEXT) {
    const t = f === "name" ? normText(c[f]) : freeText(c[f]);
    if (t === undefined) continue;
    if (!schema.safeParse(t).success) err("teks-terlalu-panjang", `${label} terlalu panjang.`, f);
    else (data as Record<string, unknown>)[f] = t;
  }

  const type = normText(c.type)?.toLowerCase();
  if (type !== undefined) {
    if ((Constants.public.Enums.asset_type as readonly string[]).includes(type))
      data.type = type as ImportAssetData["type"];
    else
      err(
        "jenis-tidak-dikenal",
        `Jenis aset "${normText(c.type)}" tidak dikenal (Tanah/Bangunan/Gabungan).`,
        "type",
      );
  }

  const region = normText(c.region);
  if (region !== undefined) {
    const up = region.toUpperCase();
    const name = ctx.regions.find((x) => x.toUpperCase() === up);
    const alias = Object.entries(ctx.regionAliases).find(([k]) => k.toUpperCase() === up)?.[1];
    if (name) resolved.region = name;
    else if (alias) {
      resolved.region = alias;
      warn("alias", `Wilayah "${region}" dibaca sebagai ${alias}.`, "region");
    } else err("wilayah-tidak-dikenal", `Wilayah "${region}" tidak dikenal.`, "region");
    data.region = region;
  }

  const util = normText(c.utilization);
  if (util !== undefined) {
    const raw = util.toLowerCase();
    const hit =
      (Object.hasOwn(ctx.utilizationAliases, raw) ? ctx.utilizationAliases[raw] : undefined) ??
      ((Constants.public.Enums.utilization_status as readonly string[]).includes(raw)
        ? { status: raw as UtilStatus, needs_review: false }
        : undefined);
    if (!UTIL_RAW.safeParse(util).success)
      err("teks-terlalu-panjang", "Status pemanfaatan terlalu panjang.", "utilization");
    else if (!hit)
      err(
        "pemanfaatan-tidak-dikenal",
        `Status pemanfaatan "${util}" tidak dikenal.`,
        "utilization",
      );
    else {
      resolved.utilization = hit.status;
      resolved.utilization_needs_review = hit.needs_review;
      const label = EXCEL_UTIL_LABEL[hit.status];
      if (hit.needs_review)
        warn(
          "perlu-review",
          `Status "${util}" tidak ada di daftar Excel; sementara dipetakan ke "${label}" dan perlu review.`,
          "utilization",
        );
      else if (raw !== label && raw !== hit.status)
        warn("alias", `Status pemanfaatan "${util}" dibaca sebagai "${label}".`, "utilization");
    }
    data.utilization = util;
  }

  for (const [f, label] of [
    ["land_area_m2", "Luas tanah"],
    ["building_area_m2", "Luas bangunan"],
    ["book_value", "Nilai buku"],
  ] as const) {
    if (c[f] === undefined) continue;
    const n = toNumber(c[f]);
    if (n === null) err("angka-tidak-valid", `${label} harus berupa angka.`, f);
    else if (n < 0) err("angka-tidak-valid", `${label} tidak boleh negatif.`, f);
    else data[f] = n;
  }
  // Sama dengan kolom generated DB value_is_placeholder / area_is_placeholder (≤ 1).
  if (data.book_value !== undefined && data.book_value <= 1)
    warn(
      "nilai-placeholder",
      "Nilai buku Rp1 (placeholder); dikecualikan dari agregat.",
      "book_value",
    );
  if (data.land_area_m2 !== undefined && data.land_area_m2 <= 1)
    warn("luas-placeholder", "Luas tanah 1 m² (placeholder).", "land_area_m2");

  for (const [f, label] of [
    ["right_expiry_date", "Tanggal akhir hak"],
    ["last_monitored_at", "Tanggal monitoring terakhir"],
  ] as const) {
    const d = parseDate(c[f], date1904);
    if (d === null) err("tanggal-tidak-valid", `${label} "${String(c[f])}" tidak bisa dibaca.`, f);
    else if (d) data[f] = d;
  }
  if (data.last_monitored_at && data.last_monitored_at > ctx.today)
    warn(
      "tgl-masa-depan",
      `Tanggal monitoring terakhir ${fmtDate(data.last_monitored_at)} di masa depan; jadwal tidak valid sampai dikoreksi.`,
      "last_monitored_at",
    );

  const exp = data.right_expiry_date;
  if (exp && exp < ctx.today) {
    issues.push({
      code: "hak-kedaluwarsa",
      level: "finding",
      field: "right_expiry_date",
      message: `Hak tanah berakhir ${fmtDate(exp)}.`,
    });
    if (data.legal_status && /clean|clear/i.test(data.legal_status))
      warn(
        "status-hak-kontradiksi",
        `Status hak "${data.legal_status}" bertentangan dengan hak yang sudah berakhir.`,
        "legal_status",
      );
  } else if (exp && exp < plus12Months(ctx.today)) {
    issues.push({
      code: "hak-berakhir",
      level: "finding",
      field: "right_expiry_date",
      message: `Hak tanah berakhir ${fmtDate(exp)} (kurang dari 12 bulan).`,
    });
  }

  if (isNew) {
    const missing = [
      !data.name && "nama",
      !data.type && c.type === undefined && "jenis",
      !data.region && "wilayah",
    ].filter(Boolean);
    if (missing.length) err("wajib", `Aset baru wajib memiliki ${missing.join(", ")}.`);
    if (!data.address) warn("alamat-kosong", "Alamat kosong.", "address");
  }

  const status = statusOf(issues);
  return {
    kind: "asset",
    row: r.row,
    asset_code: code ?? "",
    status,
    issues,
    payload: status === "rejected" ? undefined : { kind: "asset", row: r.row, data },
    resolved,
  };
}

function validateAssessment(
  r: ParsedRow<AssessmentField>,
  ctx: ValidateCtx,
  knownCodes: Set<string>,
  seen: Set<string>,
  date1904: boolean,
): RowResult {
  const c = r.cells;
  const issues: Issue[] = [];
  const err = (code: IssueCode, message: string, field?: string) =>
    issues.push({ code, level: "error", field, message });

  const code = normCode(c.asset_code);
  if (!code)
    err(
      code === undefined ? "wajib" : "id-tidak-valid",
      code === undefined ? "ID Aset kosong." : `ID Aset "${String(c.asset_code)}" tidak valid.`,
      "asset_code",
    );
  else if (!knownCodes.has(code) && !ctx.existingAssetCodes?.has(code))
    err("aset-tidak-ada", `Aset ${code} tidak ada di Master Aset maupun di data.`, "asset_code");
  else if (ctx.inactiveAssetCodes?.has(code))
    err("aset-nonaktif", "Aset nonaktif; pulihkan dulu.", "asset_code");

  const data: ImportAssessmentData = { asset_code: code ?? "", assessed_at: "" };

  const at = parseDate(c.assessed_at, date1904);
  if (at === null)
    err(
      "tanggal-tidak-valid",
      `Tanggal penilaian "${String(c.assessed_at)}" tidak bisa dibaca.`,
      "assessed_at",
    );
  else if (at === undefined) err("wajib", "Tanggal penilaian wajib diisi.", "assessed_at");
  else if (at > ctx.today)
    err("tanggal-masa-depan", `Tanggal penilaian ${fmtDate(at)} di masa depan.`, "assessed_at");
  else data.assessed_at = at;

  if (code && data.assessed_at) {
    const k = `${code}|${data.assessed_at}`;
    if (seen.has(k))
      err(
        "penilaian-duplikat",
        `Penilaian ${code} tanggal ${fmtDate(data.assessed_at)} muncul lebih dari sekali.`,
      );
    seen.add(k);
  }

  for (const f of SCORE_FIELDS) {
    if (c[f] === undefined) continue; // kosong = belum dinilai (≠ 1)
    const n = toNumber(c[f]);
    if (n === null || !Number.isInteger(n) || n < 1 || n > 5)
      err(
        "skor-tidak-valid",
        `Skor ${SCORE_LABEL[f]} "${String(c[f])}" harus bilangan bulat 1–5.`,
        f,
      );
    else data[f] = n;
  }

  for (const [f, schema, label] of [
    ["findings", A.findings, "Catatan"],
    ["follow_up", A.follow_up, "Tindak lanjut"],
    ["follow_up_pic", A.follow_up_pic, "PIC tindak lanjut"],
  ] as const) {
    const t = freeText(c[f]);
    if (t === undefined) continue;
    if (!schema.safeParse(t).success) err("teks-terlalu-panjang", `${label} terlalu panjang.`, f);
    else data[f] = t;
  }

  const td = parseDate(c.target_date, date1904);
  if (td === null)
    err(
      "tanggal-tidak-valid",
      `Target selesai "${String(c.target_date)}" tidak bisa dibaca.`,
      "target_date",
    );
  else if (td) data.target_date = td;

  // Kolom opsional "Alasan Override" (setelah kolom terakhir template). File Excel asli tidak punya
  // kolom ini → alasan override = Catatan Temuan.
  const reason = freeText(c.override_reason);
  if (reason !== undefined) {
    if (!A.override_reason.safeParse(reason).success)
      err("teks-terlalu-panjang", "Alasan override terlalu panjang (maks 2000).", "override_reason");
    else data.override_reason = reason;
  }
  const ov = c.critical_override;
  if (ov !== undefined) {
    const t = typeof ov === "boolean" ? (ov ? "YA" : "TIDAK") : normText(ov)?.toUpperCase();
    if (t === "YA") {
      const why = reason ?? data.findings;
      if (!why)
        err("override-tanpa-catatan", "Critical Override = YA wajib disertai alasan atau catatan.", "findings");
      else if (!A.override_reason.safeParse(why).success)
        err(
          "teks-terlalu-panjang",
          "Catatan terlalu panjang untuk alasan override (maks 2000).",
          "findings",
        );
      else Object.assign(data, { critical_override: true, override_reason: why });
    } else if (t === "TIDAK") data.critical_override = false;
    else
      err(
        "override-tidak-valid",
        `Critical Override "${String(ov)}" harus YA atau TIDAK.`,
        "critical_override",
      );
  }

  if (!data.findings && SCORE_FIELDS.some((f) => (data[f] ?? 0) >= 4))
    issues.push({
      code: "catatan-skor-tinggi",
      level: "warning",
      field: "findings",
      message: "Skor 4 atau 5 tanpa catatan dasar skor.",
    });

  const status = statusOf(issues);
  return {
    kind: "assessment",
    row: r.row,
    asset_code: code ?? "",
    status,
    issues,
    payload: status === "rejected" ? undefined : { kind: "assessment", row: r.row, data },
  };
}

export function validateRows(
  parsed: Extract<ParsedWorkbook, { ok: true }>,
  ctx: ValidateCtx,
): RowResult[] {
  const seenAssets = new Set<string>();
  const assets = parsed.assets.map((r) => validateAsset(r, ctx, seenAssets, parsed.date1904));
  // Penilaian hanya boleh merujuk aset Master yang lolos (yang ditolak tidak akan ada di DB).
  const known = new Set(assets.filter((a) => a.status !== "rejected").map((a) => a.asset_code));
  const seenAs = new Set<string>();
  const assessments = parsed.assessments.map((r) =>
    validateAssessment(r, ctx, known, seenAs, parsed.date1904),
  );
  return [...assets, ...assessments];
}

/** Hanya payload baris yang lolos — siap dikirim ke import_commit. */
export const toPayload = (results: RowResult[]): ImportRow[] =>
  results.flatMap((r) => (r.payload ? [r.payload] : []));
