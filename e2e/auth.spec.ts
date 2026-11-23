import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import { loginAs } from "./session";

test.describe.configure({ mode: "serial" });

const admin = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false },
  });

test("tanpa sesi: /dashboard dialihkan ke /login; halaman publik terbuka", async ({ page, request }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/);
  for (const p of ["/login", "/akses-ditolak"]) {
    const r = await request.get(p, { maxRedirects: 0 });
    expect(r.status()).toBe(200);
  }
});

test("sesi allowlist: dashboard tampil dan menu menunjukkan email", async ({ page, context, baseURL }) => {
  await loginAs(context, "admin@example.com", baseURL!);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.getByRole("button", { name: "Menu pengguna" }).click();
  await expect(page.getByRole("menu").getByText("admin@example.com").first()).toBeVisible();
});

test("akses dicabut: berakhir di /akses-ditolak dan sesi hilang", async ({ page, context, baseURL }) => {
  const email = "e2e-dicabut@example.com";
  const db = admin();
  await db.from("allowed_emails").upsert({ email, role: "admin" });
  try {
    await loginAs(context, email, baseURL!);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard$/);
    await db.from("allowed_emails").delete().eq("email", email);
    await page.reload();
    await expect(page).toHaveURL(/\/akses-ditolak/);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  } finally {
    await db.from("allowed_emails").delete().eq("email", email);
    const { data } = await db.auth.admin.listUsers();
    const u = data?.users.find((x) => x.email === email);
    if (u) await db.auth.admin.deleteUser(u.id);
  }
});

test("hook: email di luar allowlist ditolak", async () => {
  const { error } = await admin().auth.admin.generateLink({
    type: "magiclink",
    email: "bukan-allowlist@example.com",
  });
  expect(error?.status).toBe(403);
});

test("callback dengan error hook -> /login?galat=ditolak", async ({ page }) => {
  await page.goto(
    "/auth/callback?error=access_denied&error_code=unexpected_failure&error_description=" +
      encodeURIComponent("Error running hook URI: 403 tidak terdaftar"),
  );
  await expect(page).toHaveURL(/\/login\?galat=ditolak$/);
  await expect(page.getByText("tidak terdaftar sebagai pengguna")).toBeVisible();
});
