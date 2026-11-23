import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const getClaims = vi.fn();
const rpc = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getClaims }, rpc }),
}));

import { AuthError, requireRole, requireUser, type AppRole } from "./require-role";

const roles: AppRole[] = ["viewer", "editor", "admin"];
beforeEach(() => {
  getClaims.mockReset().mockResolvedValue({ data: { claims: { sub: "u1" } }, error: null });
  rpc.mockReset();
});

describe("requireUser", () => {
  it("melempar UNAUTHENTICATED tanpa sesi", async () => {
    getClaims.mockResolvedValue({ data: null, error: new Error("x") });
    await expect(requireUser()).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
  });
  it("mengembalikan claims", async () => {
    await expect(requireUser()).resolves.toEqual({ sub: "u1" });
  });
});

describe("requireRole", () => {
  it("UNAUTHENTICATED tanpa sesi", async () => {
    getClaims.mockResolvedValue({ data: null, error: null });
    await expect(requireRole("viewer")).rejects.toBeInstanceOf(AuthError);
  });
  it("FORBIDDEN bila role null", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    await expect(requireRole("viewer")).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("FORBIDDEN bila RPC error", async () => {
    rpc.mockResolvedValue({ data: "admin", error: { message: "boom" } });
    await expect(requireRole("viewer")).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("FORBIDDEN bila role tak dikenal", async () => {
    rpc.mockResolvedValue({ data: "superadmin", error: null });
    await expect(requireRole("viewer")).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  for (const have of roles)
    for (const need of roles)
      it(`${have} meminta ${need}`, async () => {
        rpc.mockResolvedValue({ data: have, error: null });
        const ok = roles.indexOf(have) >= roles.indexOf(need);
        const p = requireRole(need);
        if (ok) await expect(p).resolves.toMatchObject({ role: have });
        else await expect(p).rejects.toMatchObject({ code: "FORBIDDEN" });
      });
});
