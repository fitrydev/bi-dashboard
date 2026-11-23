import { describe, expect, it } from "vitest";
import { changedColumns } from "./audit";

describe("changedColumns", () => {
  it("hanya kolom yang berubah, tanpa kolom teknis", () => {
    expect(
      changedColumns("UPDATE", { name: "A", pic_unit: "X", updated_at: "1" }, { name: "B", pic_unit: "X", updated_at: "2" }),
    ).toEqual(["Nama"]);
  });
  it("null dan undefined setara; INSERT/DELETE kosong", () => {
    expect(changedColumns("UPDATE", { notes: null }, {})).toEqual([]);
    expect(changedColumns("INSERT", null, { name: "A" })).toEqual([]);
  });
  it("kolom baru berlabel dan tak dikenal dipakai apa adanya", () => {
    expect(changedColumns("UPDATE", { s_legal: 2, zz: 1 }, { s_legal: 3, zz: 2 })).toEqual(["Skor legalitas", "zz"]);
  });
});
