import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { loginAs } from "./session";

test.describe.configure({ mode: "serial" });

const FILE = "source/Template_Matriks_Risiko_Monitoring_Aset_2027.xlsx"; // read-only
const VIEWER = "viewer@example.com";
const EDITOR = "editor@example.com";
const admin = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });

test.beforeAll(async () => {
  const { error } = await admin().from("allowed_emails").upsert([
    { email: VIEWER, role: "viewer" },
    { email: EDITOR, role: "editor" },
  ]);
  if (error) throw error;
});

const desktopOnly = (info: { project: { name: string } }) =>
  test.skip(info.project.name !== "desktop", "alur tulis hanya di desktop");

const summary = async (page: Page) => {
  const t = await page.locator("main").innerText();
  const n = (re: RegExp) => Number(t.match(re)?.[1].replace(/\./g, "") ?? NaN);
  return {
    dibaca: n(/([\d.]+) baris dibaca/),
    ditolak: n(/Ditolak: ([\d.]+)/),
    peringatan: n(/Peringatan data: ([\d.]+)/),
    temuan: n(/Temuan risiko: ([\d.]+)/),
    siap: n(/Siap: ([\d.]+)/),
    baru: n(/Baru ([\d.]+) ·/),
    berubah: n(/Berubah ([\d.]+) ·/),
    sama: n(/Sama ([\d.]+)/),
  };
};

async function upload(page: Page, path = FILE) {
  await page.goto("/import");
  await page.waitForLoadState("networkidle"); // tunggu hidrasi sebelum onChange dipasang
  await page.locator("#berkas").setInputFiles(path);
  await expect(page.getByRole("heading", { name: /Hasil pemeriksaan/ })).toBeVisible({ timeout: 30_000 });
}

// Visual dulu (seed bersih), sebelum skenario tulis.
for (const scheme of ["light", "dark"] as const)
  test(`6. /import ${scheme}: unggah & pratinjau tanpa scroll horizontal dan galat konsol`, async ({ page, context, baseURL }, info) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
    page.on("console", (m) => m.type() === "error" && errors.push(`console: ${m.text()}`));
    await page.emulateMedia({ colorScheme: scheme });
    await loginAs(context, "admin@example.com", baseURL!);
    const kind = info.project.name === "mobile" ? "mobile" : "desktop";
    const noScroll = async () => {
      const w = await page.evaluate(() => ({ s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth }));
      expect(w.s).toBeLessThanOrEqual(w.c);
    };
    await page.goto("/import");
    await expect(page.getByRole("heading", { name: "Unggah berkas Excel" })).toBeVisible();
    await page.waitForLoadState("networkidle");
    await noScroll();
    await page.screenshot({ path: `docs/screenshots/fase-7/import-unggah-${kind}-${scheme}.png`, fullPage: true });
    await upload(page);
    await noScroll();
    await page.screenshot({ path: `docs/screenshots/fase-7/import-pratinjau-${kind}-${scheme}.png`, fullPage: true });
    expect(errors).toEqual([]);
  });

test("1. viewer: tidak ada form unggah, pesan hanya-baca", async ({ page, context, baseURL }) => {
  await loginAs(context, VIEWER, baseURL!);
  await page.goto("/import");
  await expect(page.getByText("Peran Anda hanya-baca")).toBeVisible();
  await expect(page.locator("#berkas")).toHaveCount(0);
});

test("2. editor: pratinjau file asli, commit, dashboard 136 aset", async ({ page, context, baseURL }, info) => {
  desktopOnly(info);
  await loginAs(context, EDITOR, baseURL!);
  await upload(page);
  const s = await summary(page);
  console.log("PRATINJAU file asli:", JSON.stringify(s));
  expect(s.ditolak).toBe(0);
  expect(s.peringatan).toBeGreaterThan(0);
  expect(s.temuan).toBe(4); // 3 hak lewat + 1 < 12 bulan (PLAN §2.3)
  expect(s.dibaca).toBe(137); // 136 baris Master + 1 baris Penilaian
  expect(s.baru).toBe(0);
  console.log("Berubah (idealnya 0):", s.berubah);
  const main = page.locator("main");
  await expect(main).toContainText(/placeholder/i);
  await expect(main).toContainText(/Hak tanah berakhir/i);

  const before = await admin().from("import_batches").select("*", { count: "exact", head: true });
  await page.getByRole("button", { name: "Lanjut ke konfirmasi" }).click();
  await page.getByRole("button", { name: /^Impor [\d.]+ baris$/ }).click();
  await expect(page.getByRole("heading", { name: "Impor selesai" })).toBeVisible({ timeout: 30_000 });
  console.log("RINGKASAN:", await page.locator("section p").first().innerText());
  const after = await admin().from("import_batches").select("*", { count: "exact", head: true });
  expect(after.count).toBe((before.count ?? 0) + 1);

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("dari 136 aset");
  await expect(page.getByText("44 aset placeholder tidak dihitung")).toBeVisible();
});

test("3. impor ulang file sama: semua Sama, aset tetap 136", async ({ page, context, baseURL }, info) => {
  desktopOnly(info);
  await loginAs(context, EDITOR, baseURL!);
  await upload(page);
  const s = await summary(page);
  console.log("PRATINJAU impor ulang:", JSON.stringify(s));
  expect(s.baru).toBe(0);
  expect(s.berubah).toBe(0);
  expect(s.sama).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Lanjut ke konfirmasi" }).click();
  await page.getByRole("button", { name: /^Impor [\d.]+ baris$/ }).click();
  await expect(page.getByRole("heading", { name: "Impor selesai" })).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("section p").first()).toContainText("0 baru, 0 diperbarui");
  const { count } = await admin().from("assets").select("*", { count: "exact", head: true });
  expect(count).toBe(136);
});

test("4. ekspor lalu impor: semua Sama", async ({ page, context, baseURL }, info) => {
  desktopOnly(info);
  await loginAs(context, EDITOR, baseURL!);
  await page.goto("/import");
  const dl = page.waitForEvent("download");
  await page.getByRole("link", { name: /Ekspor data saat ini/ }).click();
  const path = test.info().outputPath("ekspor.xlsx");
  await (await dl).saveAs(path);
  await upload(page, path);
  const s = await summary(page);
  console.log("PRATINJAU round-trip:", JSON.stringify(s));
  expect(s.ditolak).toBe(0);
  expect(s.baru).toBe(0);
  expect(s.berubah).toBe(0);
  expect(s.sama).toBeGreaterThan(0);
});

test("5. CSV terfilter Jawa Barat: BOM, pemisah ;, 12 baris", async ({ page, context, baseURL }, info) => {
  desktopOnly(info);
  await loginAs(context, EDITOR, baseURL!);
  await page.goto("/aset?wilayah=JAWA%20BARAT");
  await expect(page.locator("p.ml-auto[aria-live=polite]")).toHaveText(/^12 dari 136 aset$/);
  const dl = page.waitForEvent("download");
  await page.getByRole("link", { name: "Ekspor" }).click();
  const d = await dl;
  expect(d.suggestedFilename()).toMatch(/\.csv$/);
  const buf = readFileSync((await d.path())!);
  expect([...buf.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
  const lines = buf.toString("utf8").slice(1).split("\r\n").filter(Boolean);
  expect(lines[0]).toContain(";");
  expect(lines.length - 1).toBe(12);
});
