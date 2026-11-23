import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { AuthError } from "@/lib/auth/require-role";
import { MSG, toActionError, toFieldErrors } from "./result";

describe("toActionError", () => {
  it("AuthError", () => {
    expect(toActionError(new AuthError("UNAUTHENTICATED")).error).toBe(
      "Sesi berakhir. Masuk lagi.",
    );
    expect(toActionError(new AuthError("FORBIDDEN")).error).toBe(
      "Anda tidak punya akses untuk mengubah data.",
    );
  });
  it("kode Postgres → pesan Indonesia, tanpa pesan mentah", () => {
    const raw = 'duplicate key value violates unique constraint "assets_asset_code_key"';
    const r = toActionError({ code: "23505", message: raw });
    expect(r.error).toBe("Kode aset sudah dipakai aset lain.");
    expect(JSON.stringify(r)).not.toContain("duplicate");
    expect(toActionError({ code: "22007" }).error).toMatch(/Tanggal/);
    expect(toActionError({ code: "23514" }).error).toMatch(/validasi/);
    expect(toActionError({ code: "42501" }).error).toBe(MSG.forbidden);
  });
  it("tak dikenal → pesan generik", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(toActionError(new Error("koneksi putus: host 10.0.0.1")).error).toBe(MSG.generic);
    expect(toActionError({ code: "XX000", message: "rahasia" }).error).toBe(MSG.generic);
    spy.mockRestore();
  });
});

describe("toFieldErrors", () => {
  it("path bertitik", () => {
    const r = z
      .object({ scores: z.object({ legal: z.number() }) })
      .safeParse({ scores: { legal: "x" } });
    expect(r.success).toBe(false);
    if (!r.success) expect(toFieldErrors(r.error).fieldErrors).toHaveProperty("scores.legal");
  });
});
