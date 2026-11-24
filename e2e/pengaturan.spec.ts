import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import * as XLSX from "xlsx";
import { loginAs } from "./session";

test.describe.configure({ mode: "serial" });

const VIEWER = "viewer@example.com";
const EDITOR = "editor@example.com";
const ADMIN = "admin@example.com";
const DB = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const admin = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });

// Pulihkan state global: versi >1 (terkunci setelah aktif, trigger menolak hapus) dibuang dengan
// session_replication_role=replica (superuser lokal), v1 diaktifkan lagi. Penilaian lama tidak pernah disentuh.
function resetParams() {
  execFileSync(
    "psql",
    [
      DB,
      "-v", "ON_ERROR_STOP=1",
      "-c",
      `begin; set local session_replication_role = replica;
       update public.scoring_params set is_active = false where is_active; update public.scoring_params set is_active = true where version = 1;
       delete from public.score_criteria where params_version > 1;
       delete from public.scoring_params where version > 1; commit;`,
    ],
    { env: { ...process.env, PGPASSWORD: "postgres" } },
  );
}

test.beforeAll(async () => {
  const { error } = await admin().from("allowed_emails").upsert([
    { email: VIEWER, role: "viewer" },
    { email: EDITOR, role: "editor" },
  ]);
  if (error) throw error;
  resetParams();
});
test.afterAll(() => resetParams());

const desktopOnly = (info: { project: { name: string } }) =>
  test.skip(info.project.name !== "desktop", "alur tulis hanya di desktop");

const TABS = ["pengguna", "parameter", "rubrik", "alias", "review"] as const;

// Visual dulu (seed bersih), sebelum skenario tulis.
for (const tab of TABS)
  for (const scheme of ["light", "dark"] as const)
    test(`6. /pengaturan?tab=${tab} ${scheme}: tanpa scroll horizontal & galat konsol`, async ({ page, context, baseURL }, info) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
      page.on("console", (m) => m.type() === "error" && errors.push(`console: ${m.text()}`));
      await page.emulateMedia({ colorScheme: scheme });
      await loginAs(context, ADMIN, baseURL!);
      await page.goto(`/pengaturan?tab=${tab}`);
      await expect(page.getByTestId(`tab-${tab}`)).toHaveAttribute("aria-current", "page");
      await page.waitForLoadState("networkidle");
      const w = await page.evaluate(() => ({ s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth }));
      expect(w.s).toBeLessThanOrEqual(w.c);
      const kind = info.project.name === "mobile" ? "mobile" : "desktop";
      await page.screenshot({ path: `docs/screenshots/fase-8/${tab}-${kind}-${scheme}.png`, fullPage: true });
      expect(errors).toEqual([]);
    });

for (const [name, email] of [["editor", EDITOR], ["viewer", VIEWER]] as const)
  test(`1. ${name}: halaman terlarang dan tanpa link Pengaturan`, async ({ page, context, baseURL }) => {
    await loginAs(context, email, baseURL!);
    await page.goto("/pengaturan");
    await expect(page.getByTestId("pengaturan-forbidden")).toBeVisible();
    await expect(page.getByTestId("tab-parameter")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Pengaturan" })).toHaveCount(0);
  });

test("2. admin: tambah pengguna, ubah peran, cabut; diri sendiri tidak bisa dicabut", async ({ page, context, baseURL }, info) => {
  desktopOnly(info);
  const email = `uji-${Date.now()}@example.com`;
  try {
    await loginAs(context, ADMIN, baseURL!);
    await page.goto("/pengaturan");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("button", { name: `Cabut akses ${ADMIN}` })).toBeDisabled();

    const form = page.getByRole("form", { name: "Tambah pengguna" });
    await form.getByLabel("Email Google").fill(email);
    await form.getByLabel("Peran").selectOption("viewer");
    await form.getByRole("button", { name: "Tambah pengguna" }).click();
    const row = page.getByTestId(`user-${email}`);
    await expect(row).toBeVisible();

    await row.getByRole("combobox").selectOption("editor");
    await expect(page.getByText(`Peran ${email} menjadi`)).toBeVisible();
    await expect.poll(async () => (await admin().from("allowed_emails").select("role").eq("email", email).single()).data?.role).toBe("editor");

    await row.getByRole("button", { name: `Cabut akses ${email}` }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Cabut akses" }).click();
    await expect(row).toHaveCount(0);
  } finally {
    await admin().from("allowed_emails").delete().eq("email", email);
  }
});

test("3. admin: draf versi, bobot, pratinjau, aktifkan; skor lama tetap", async ({ page, context, baseURL }, info) => {
  desktopOnly(info);
  await loginAs(context, ADMIN, baseURL!);
  await page.goto("/pengaturan?tab=parameter");
  await page.getByRole("button", { name: "Buat draf dari versi aktif" }).click();
  await page.waitForURL(/versi=(\d+)/);
  const n = Number(new URL(page.url()).searchParams.get("versi"));
  expect(n).toBeGreaterThan(1);

  // Tukar bobot legal(20) dan control(25): total tetap 100.
  await page.locator("#w-legal").fill("25");
  await expect(page.getByTestId("weight-total")).toContainText("Total: 105");
  await page.locator("#w-control").fill("20");
  await expect(page.getByTestId("weight-total")).toContainText("(sesuai)");
  await expect(page.getByTestId("diff-w-legal")).toBeVisible();
  await page.getByRole("button", { name: "Simpan draf" }).click();
  await expect(page.getByText(`Draf versi ${n} disimpan`)).toBeVisible();

  await page.getByRole("button", { name: "Pratinjau dampak" }).click();
  await expect(page.getByTestId("impact")).toBeVisible();
  const total = Number((await page.getByTestId("impact-total").innerText()).replace(/\D/g, ""));
  expect(total).toBeGreaterThan(0);
  await expect(page.getByTestId("impact-score")).toHaveText(/^\d/);
  await expect(page.getByTestId("impact-category")).toHaveText(/^\d/);

  await page.getByTestId("activate").click();
  await page.getByRole("dialog").getByRole("button", { name: "Aktifkan", exact: true }).click();
  await expect(page.getByText(`Versi ${n} aktif`)).toBeVisible();
  await expect(page.getByTestId(`version-${n}`)).toContainText("Aktif");

  // Skor penilaian lama tidak berubah: tersimpan tetap memakai versi 1.
  const { data } = await admin().from("assessments").select("params_version,total_score").eq("params_version", n);
  expect(data).toEqual([]);
  await page.goto("/aset/251116");
  await expect(page.locator("main")).toContainText("47,0");

  // Hitung ulang: pratinjau saja (tidak diterapkan; state dipulihkan di afterAll).
  await page.goto("/pengaturan?tab=parameter");
  await page.getByTestId("recalc-preview").click();
  await expect(page.getByTestId("impact").or(page.getByTestId("recalc-none")).first()).toBeVisible();
  await expect(page.getByTestId("impact-total")).toBeVisible();

  resetParams();
  await page.goto("/dashboard");
  await expect(page.locator("main")).toContainText("47,0");
});

test("4. alias baru dipakai impor", async ({ page, context, baseURL }, info) => {
  desktopOnly(info);
  const ALIAS = "JABAR-UJI";
  const CODE = "UJI-ALIAS-1";
  const sb = admin();
  try {
    await loginAs(context, ADMIN, baseURL!);
    const { data: reg } = await sb.from("regions").select("id").eq("name", "JAWA BARAT").single();
    await page.goto("/pengaturan?tab=alias");
    await page.waitForLoadState("networkidle");
    const form = page.getByRole("form", { name: "Tambah alias wilayah" });
    await form.getByLabel("Alias (teks di Excel)").fill(ALIAS);
    await form.getByLabel("Wilayah resmi").selectOption(reg!.id);
    await form.getByRole("button", { name: "Simpan alias" }).click();
    await expect(page.getByTestId(`region-alias-${ALIAS}`)).toBeVisible();

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["MASTER"], [], [], ["ID Aset", "Nama Aset", "Jenis Aset", "Distrik"], [CODE, "Aset uji alias", "Tanah", ALIAS]]), "Master Aset");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["PENILAIAN"], [], [], ["ID Aset", "Tanggal Penilaian"]]), "Penilaian Risiko");
    const path = test.info().outputPath("alias.xlsx");
    XLSX.writeFile(wb, path);

    await page.goto("/import");
    await page.waitForLoadState("networkidle");
    await page.locator("#berkas").setInputFiles(path);
    await expect(page.getByRole("heading", { name: /Hasil pemeriksaan/ })).toBeVisible({ timeout: 30_000 });
    const main = page.locator("main");
    await expect(main).toContainText(/Ditolak: 0/);
    await expect(main).toContainText(`Wilayah "${ALIAS}" dibaca sebagai JAWA BARAT`);
    await page.getByRole("button", { name: "Lanjut ke konfirmasi" }).click();
    await page.getByRole("button", { name: /^Impor [\d.]+ baris$/ }).click();
    await expect(page.getByRole("heading", { name: "Impor selesai" })).toBeVisible({ timeout: 30_000 });
    const { data: a } = await sb.from("assets").select("region_id").eq("asset_code", CODE).single();
    expect(a?.region_id).toBe(reg!.id);
  } finally {
    await sb.from("assets").delete().eq("asset_code", CODE);
    await sb.from("region_aliases").delete().eq("alias", ALIAS);
  }
});

test("5. koreksi massal: konfirmasi apa adanya mengurangi hitungan", async ({ page, context, baseURL }, info) => {
  desktopOnly(info);
  const sb = admin();
  let ids: string[] = [];
  try {
    await loginAs(context, ADMIN, baseURL!);
    await page.goto("/pengaturan?tab=review");
    await page.waitForLoadState("networkidle");
    const count = page.getByTestId("review-count");
    const before = Number((await count.innerText()).match(/dari ([\d.]+)/)![1].replace(/\./g, ""));
    expect(before).toBeGreaterThan(2);
    const items = page.getByTestId("review-list").getByRole("checkbox");
    const codes = [
      await page.getByTestId("review-list").locator("li").nth(0).locator("span").first().innerText(),
      await page.getByTestId("review-list").locator("li").nth(1).locator("span").first().innerText(),
    ];
    ids = ((await sb.from("assets").select("id").in("asset_code", codes)).data ?? []).map((x) => x.id);
    await items.nth(0).click();
    await items.nth(1).click();
    await expect(count).toContainText("2 dipilih");
    await page.getByTestId("review-confirm").click();
    await page.getByRole("dialog").getByRole("button", { name: "Konfirmasi", exact: true }).click();
    await expect(page.getByText("2 aset dikonfirmasi apa adanya")).toBeVisible();
    await expect(count).toContainText(`dari ${(before - 2).toLocaleString("id-ID")}`);
  } finally {
    if (ids.length) await sb.from("assets").update({ utilization_needs_review: true }).in("id", ids);
  }
});
