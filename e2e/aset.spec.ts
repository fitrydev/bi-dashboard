import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import { loginAs } from "./session";

test.describe.configure({ mode: "serial" });

const VIEWER = "viewer@example.com";
const EDITOR = "editor@example.com";
const count = (page: Page) => page.locator("p.ml-auto[aria-live=polite]");

test.beforeAll(async () => {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false },
  });
  const { error } = await admin.from("allowed_emails").upsert([
    { email: VIEWER, role: "viewer" },
    { email: EDITOR, role: "editor" },
  ]);
  if (error) throw error;
});

const desktopOnly = (info: { project: { name: string } }) =>
  test.skip(info.project.name !== "desktop", "alur tulis hanya di desktop (tabel + hapus)");

/** Kode aset belum dinilai ke-n (urut ID) dari tabel desktop. */
async function unrated(page: Page, n = 0) {
  await page.goto("/aset?dinilai=tidak&urut=id:asc");
  const cell = page.locator("tbody tr td:first-child").nth(n);
  await expect(cell).toBeVisible();
  return (await cell.innerText()).trim();
}

// Screenshot dulu (seed bersih setelah db reset), sebelum skenario tulis 4–7 mengubah data.
const PAGES: [string, string][] = [
  ["aset", "/aset"],
  ["detail", "/aset/251116"],
  ["nilai", "/aset/251116/nilai"],
  ["monitoring", "/aset/251116/monitoring"],
  ["jadwal", "/jadwal"],
  ["jadwal-kalender", "/jadwal?tampil=kalender"],
];
for (const [name, path] of PAGES)
  for (const scheme of ["light", "dark"] as const)
    test(`9. ${path} ${scheme}: tanpa scroll horizontal & galat konsol`, async ({ page, context, baseURL }, info) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
      page.on("console", (m) => m.type() === "error" && errors.push(`console: ${m.text()}`));
      await page.emulateMedia({ colorScheme: scheme });
      await loginAs(context, "admin@example.com", baseURL!);
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.waitForLoadState("networkidle");
      const w = await page.evaluate(() => ({ s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth }));
      expect(w.s).toBeLessThanOrEqual(w.c);
      const kind = info.project.name === "mobile" ? "mobile" : "desktop";
      await page.screenshot({ path: `docs/screenshots/fase-6/${name}-${kind}-${scheme}.png`, fullPage: true });
      expect(errors).toEqual([]);
    });

test("1. link dashboard membuka daftar terfilter dengan hitungan benar", async ({ page, context, baseURL }) => {
  await loginAs(context, "admin@example.com", baseURL!);
  const cases: [string, RegExp][] = [
    ["warn=hak-kedaluwarsa", /^3 dari 136 aset$/],
    ["pemanfaatan=idle_kosong", /^13 dari 136 aset$/],
    ["dinilai=ya", /^([1-9]\d*) dari 136 aset$/],
  ];
  for (const [q, re] of cases) {
    await page.goto("/dashboard");
    const link = page.locator(`a[href*="${q}"]`).first();
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(new RegExp(q));
    await expect(count(page)).toHaveText(re);
  }
  // coverage < 20%: tautan kategori di dashboard disembunyikan, jadi URL dibuka langsung
  await page.goto("/aset?kategori=medium");
  await expect(count(page)).toHaveText(/^[1-9]\d* dari 136 aset$/);
  await expect(page.getByRole("list", { name: "Filter aktif" })).toContainText("Kategori:");

  await page.goto("/aset?wilayah=JAWA%20BARAT");
  await expect(count(page)).toHaveText(/^12 dari 136 aset$/);
});

test("2. filter URL: pencarian, round trip, bottom sheet mobile", async ({ page, context, baseURL }, info) => {
  await loginAs(context, "admin@example.com", baseURL!);
  await page.goto("/aset?urut=id:asc");
  await expect(count(page)).toHaveText(/^136 dari 136 aset$/);
  const code = info.project.name === "desktop"
    ? (await page.locator("tbody tr td:first-child").first().innerText()).trim()
    : (await page.locator('ul[aria-label="Daftar aset"] li .font-mono').first().innerText()).trim();

  const search = page.getByRole("searchbox", { name: "Cari nama atau ID aset" });
  await search.fill(code);
  await expect(page).toHaveURL(new RegExp(`q=${code}`));
  await expect(count(page)).not.toHaveText(/^136 dari/);
  await page.reload();
  await expect(search).toHaveValue(code);
  await expect(page.getByRole("list", { name: "Filter aktif" })).toContainText(`Cari: ${code}`);

  if (info.project.name === "mobile") {
    await page.goto("/aset");
    await page.getByRole("button", { name: "Filter", exact: true }).click();
    await page.getByRole("radio", { name: "Sudah dinilai" }).check();
    await page.getByRole("button", { name: /^Terapkan/ }).click();
    await expect(page).toHaveURL(/dinilai=ya/);
    await expect(page.getByRole("button", { name: "Filter (1 aktif)" })).toBeVisible();
    await expect(count(page)).toHaveText(/^[1-9]\d* dari 136 aset$/);
  }
});

test("3. viewer: tanpa hapus, nilai/monitoring hanya-lihat", async ({ page, context, baseURL }, info) => {
  await loginAs(context, VIEWER, baseURL!);
  await page.goto("/aset");
  await expect(count(page)).toHaveText(/136 dari 136/);
  await expect(page.locator('button[aria-label^="Hapus "]')).toHaveCount(0);
  await page.goto("/aset/251116/nilai");
  await expect(page.getByText("Anda hanya bisa melihat")).toBeVisible();
  await expect(page.locator("form")).toHaveCount(0);
  await page.goto("/aset/251116/monitoring");
  await expect(page.getByText("hanya bisa melihat data")).toBeVisible();
  await expect(page.locator("form")).toHaveCount(0);
  void info;
});

test("4. editor menilai aset belum dinilai; coverage dashboard +1", async ({ page, context, baseURL }, info) => {
  desktopOnly(info);
  await loginAs(context, EDITOR, baseURL!);
  const assessed = async () => {
    await page.goto("/dashboard");
    const dd = page.locator("dl", { hasText: "Sudah dinilai" }).locator("dd").first();
    return Number((await dd.innerText()).replace(/\D/g, ""));
  };
  const before = await assessed();
  const code = await unrated(page);
  await page.goto(`/aset/${code}/nilai`);
  const sets = page.locator("form fieldset");
  await expect(sets).toHaveCount(6);
  for (let i = 0; i < 6; i++) await sets.nth(i).getByRole("radio").nth(3).check(); // skor 4
  await page.getByRole("button", { name: "Simpan penilaian" }).click();
  await expect(page.getByText("Isi catatan untuk skor 4 atau 5.").first()).toBeVisible();
  await page.getByLabel(/Catatan temuan/).fill("Catatan e2e: kondisi fisik perlu perhatian.");
  await page.getByRole("button", { name: "Simpan penilaian" }).click();
  await expect(page).toHaveURL(new RegExp(`/aset/${code}$`));
  expect(await assessed()).toBe(before + 1);
});

test("5. simpan draf, lanjutkan, buang", async ({ page, context, baseURL }, info) => {
  desktopOnly(info);
  await loginAs(context, EDITOR, baseURL!);
  const code = await unrated(page);
  await page.goto(`/aset/${code}/nilai`);
  await page.locator("form fieldset").first().getByRole("radio").nth(1).check();
  await page.getByRole("button", { name: "Simpan draf" }).click();
  await expect(page.getByText("Draf disimpan.").first()).toBeVisible();
  await page.reload();
  await expect(page.getByText(/Melanjutkan draf tersimpan/)).toBeVisible();
  await page.getByRole("button", { name: "Buang draf" }).click();
  await expect(page.getByText(/Melanjutkan draf tersimpan/)).toHaveCount(0);
  await page.reload();
  await expect(page.getByText(/Melanjutkan draf tersimpan/)).toHaveCount(0);
});

test("6. catat monitoring: hari ini masuk riwayat, besok ditolak", async ({ page, context, baseURL }, info) => {
  desktopOnly(info);
  await loginAs(context, EDITOR, baseURL!);
  await page.goto("/aset/251116/monitoring");
  const date = page.getByLabel("Tanggal monitoring");
  await expect(date).toHaveValue(/^\d{4}-\d{2}-\d{2}$/);
  const today = await date.inputValue();
  const t = new Date(`${today}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + 1);
  const tomorrow = t.toISOString().slice(0, 10);

  await page.getByText("Kunjungan lapangan").click();
  await date.fill(tomorrow);
  await page.getByRole("button", { name: "Simpan monitoring" }).click();
  await expect(page.getByText("Tanggal monitoring tidak boleh di masa depan.").first()).toBeVisible();
  await expect(page).toHaveURL(/\/monitoring$/);

  const note = `Temuan e2e ${Date.now()}`;
  await date.fill(today);
  await page.getByLabel(/Temuan/).fill(note);
  await page.getByRole("button", { name: "Simpan monitoring" }).click();
  await expect(page).toHaveURL(/\/aset\/251116$/);
  await expect(page.locator("#riwayat-monitoring")).toContainText(note);
});

test("7. hapus aset lalu urungkan", async ({ page, context, baseURL }, info) => {
  desktopOnly(info);
  await loginAs(context, EDITOR, baseURL!);
  const code = await unrated(page, 1);
  const row = page.locator("tbody tr").filter({ has: page.locator(`[data-del="${code}"]`) });
  await expect(row).toHaveCount(1);
  await row.locator(`[data-del="${code}"]`).click();
  await expect(row).toHaveCount(0);
  await page.getByRole("button", { name: "Urungkan" }).click();
  await expect(row).toHaveCount(1);
  await page.reload();
  await expect(row).toHaveCount(1);
  await expect(count(page)).toHaveText(/\d+ dari 136 aset/);
});

test("8. kode tak dikenal menampilkan UI tidak ditemukan", async ({ page, context, baseURL }) => {
  await loginAs(context, "admin@example.com", baseURL!);
  await page.goto("/aset/__none__"); // soft 404: status 200 diterima
  await expect(page.getByText(/tidak ditemukan/i).first()).toBeVisible();
});

test("10. toast Urungkan tetap tampil saat difokus (> 8 dtk)", async ({ page, context, baseURL }, info) => {
  desktopOnly(info);
  await loginAs(context, EDITOR, baseURL!);
  const code = await unrated(page, 1);
  const row = page.locator("tbody tr").filter({ has: page.locator(`[data-del="${code}"]`) });
  await row.locator(`[data-del="${code}"]`).click();
  await expect(row).toHaveCount(0);
  const undo = page.getByRole("button", { name: "Urungkan" });
  await undo.focus();
  await page.waitForTimeout(9_500);
  await expect(undo).toBeVisible();
  await undo.click();
  await expect(row).toHaveCount(1);
});
