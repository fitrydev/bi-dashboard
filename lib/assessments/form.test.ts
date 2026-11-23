import { describe, expect, it } from "vitest";
import {
  fieldId,
  findingsRequired,
  initialValues,
  issuesToFieldErrors,
  mapFieldErrors,
  toPayload,
} from "./form";

const last = { legal: 2, control: 3, physical: null, utilization: 1, location: 2, strategic: 5 };

describe("initialValues", () => {
  it("draf menang atas penilaian terakhir", () => {
    const r = initialValues({
      draft: { assessed_at: "2026-11-01", scores: { legal: 4 }, findings: "x" },
      last,
      today: "2026-11-23",
    });
    expect(r.source).toBe("draft");
    expect(r.values.scores.legal).toBe(4);
    expect(r.values.scores.control).toBeUndefined();
    expect(r.values.assessed_at).toBe("2026-11-01");
    expect(r.values.findings).toBe("x");
  });
  it("tanpa draf: skor terakhir, tanggal hari ini, catatan kosong", () => {
    const r = initialValues({ draft: null, last, today: "2026-11-23" });
    expect(r.source).toBe("last");
    expect(r.values.scores.physical).toBeNull();
    expect(r.values.assessed_at).toBe("2026-11-23");
    expect(r.values.findings).toBe("");
  });
  it("kosong bila tidak ada keduanya", () => {
    const r = initialValues({ draft: null, last: null, today: "2026-11-23" });
    expect(r.source).toBe("empty");
    expect(Object.values(r.values.scores).every((v) => v === undefined)).toBe(true);
  });
});

describe("helpers", () => {
  it("toPayload memetakan undefined ke null", () => {
    const { values } = initialValues({ draft: null, last: null, today: "2026-11-23" });
    expect(toPayload(values, "A1").scores.legal).toBeNull();
  });
  it("findingsRequired", () => {
    const { values } = initialValues({ draft: null, last, today: "2026-11-23" });
    expect(findingsRequired(values)).toBe(true); // strategic 5
    expect(findingsRequired({ scores: { ...values.scores, strategic: 2 }, critical_override: false })).toBe(false);
    expect(findingsRequired({ scores: { ...values.scores, strategic: 2 }, critical_override: true })).toBe(true);
  });
  it("mapFieldErrors: pesan pertama, urut form", () => {
    const m = mapFieldErrors({ findings: ["b", "c"], "scores.legal": ["a"], zzz: ["z"] });
    expect(Object.keys(m)).toEqual(["scores.legal", "findings", "zzz"]);
    expect(m.findings).toBe("b");
    expect(mapFieldErrors(undefined)).toEqual({});
  });
  it("issuesToFieldErrors + fieldId", () => {
    expect(issuesToFieldErrors([{ path: ["scores", "legal"], message: "m" }, { path: [], message: "n" }])).toEqual({
      "scores.legal": ["m"],
      _form: ["n"],
    });
    expect(fieldId("scores.legal")).toBe("f-scores-legal");
  });
});
