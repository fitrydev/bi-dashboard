import { describe, expect, it } from "vitest";
import { fromLatestView, type LatestRow } from "./asset-row";

const base = {
  id: "1", asset_code: "A1", name: "X", type: "gabungan", region: "JKT", address: null, book_value: 1,
  value_is_placeholder: true, area_is_placeholder: false, category: null, utilization_label: "Idle/Kosong",
  utilization_needs_review: false, assessed_at: null,
} as unknown as LatestRow;

describe("fromLatestView", () => {
  it("placeholder -> value null, kategori null -> unrated, tipe diperluas", () => {
    const r = fromLatestView(base, ["nilai-placeholder"]);
    expect(r.value).toBeNull();
    expect(r.level).toBe("unrated");
    expect(r.assessment).toBeNull();
    expect(r.type).toBe("Gabungan");
    expect(r.utilization).toBe("Idle/Kosong");
    expect(r.flags.value_placeholder).toBe(true);
  });
  it("penilaian dipetakan", () => {
    const r = fromLatestView(
      { ...base, value_is_placeholder: false, book_value: 500, category: "high", assessed_at: "2026-01-01", total_score: 70, s_legal: 4 } as LatestRow,
      ["hak-berakhir"],
    );
    expect(r.value).toBe(500);
    expect(r.level).toBe("high");
    expect(r.score).toBe(70);
    expect(r.assessment?.scores.legal).toBe(4);
    expect(r.flags.right_expiring_12m).toBe(true);
  });
});
