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

async function newDraft(page: import("@playwright/test").Page) {
  await page.goto("/pengaturan?tab=parameter");
  await page.getByRole("button", { name: "Buat draf dari versi aktif" }).click();
  await page.waitForURL(/versi=(\d+)/);
  return Number(new URL(page.url()).searchParams.get("versi"));
}

test("7. terapkan hitung ulang: penilaian pindah ke versi aktif, skor berubah", async ({ page, context, baseURL }, info) => {
  desktopOnly(info);
  const sb = admin();
  // Jumlah penilaian bergantung test lain (aset.spec menambah) → snapshot semua, pulihkan per id.
  const { data: before } = await sb.from("assessments").select("id,params_version,total_score,category");
  expect(before!.length).toBeGreaterThan(0);
  try {
    await loginAs(context, ADMIN, baseURL!);
    const n = await newDraft(page);
    await page.locator("#w-legal").fill("25");
    await page.locator("#w-control").fill("20");
    await page.getByRole("button", { name: "Simpan draf" }).click();
    await expect(page.getByText(`Draf versi ${n} disimpan`)).toBeVisible();
    await page.getByRole("button", { name: "Pratinjau dampak" }).click();
    await expect(page.getByTestId("impact")).toBeVisible();
    await page.getByTestId("activate").click();
    await page.getByRole("dialog").getByRole("button", { name: "Aktifkan", exact: true }).click();
    await expect(page.getByText(`Versi ${n} aktif`)).toBeVisible();

    await page.getByTestId("recalc-preview").click();
    await expect(page.getByTestId("impact-total")).toHaveText(/^[1-9]/);
    const total = Number((await page.getByTestId("impact-total").innerText()).replace(/\D/g, ""));
    await page.getByTestId("recalc-apply").click();
    await page.getByRole("dialog").getByRole("button", { name: "Terapkan hitung ulang", exact: true }).click();
    await expect(page.getByText(`${total} penilaian dihitung ulang dengan versi ${n}`)).toBeVisible();
    // Σ(skor×bobot): legal 1 & control 2 ditukar bobotnya (25/20) → 46 (sebelumnya 47) untuk penilaian seed.
    const { data: after } = await sb.from("assessments").select("id,params_version,total_score");
    expect(after!.filter((a) => a.params_version === n)).toHaveLength(total);
    const seed = after!.find((a) => a.id === before![0].id)!;
    const was = before!.find((b) => b.id === seed.id)!;
    if (seed.params_version === n) expect(seed.total_score).not.toBe(was.total_score);
    await page.getByTestId("recalc-preview").click();
    await expect(page.getByTestId("recalc-none")).toBeVisible();
  } finally {
    // Pulihkan penilaian (trigger hitung dilewati lewat replica) sebelum versi >1 dibuang.
    const vals = before!.map((b) => `('${b.id}'::uuid, ${b.params_version}, ${b.total_score ?? "null"}::numeric, ${b.category ? `'${b.category}'` : "null"})`).join(",");
    execFileSync("psql", [DB, "-v", "ON_ERROR_STOP=1", "-c",
      `begin; set local session_replication_role = replica;
       update public.assessments a set params_version = v.pv, total_score = v.ts, category = v.cat::public.risk_category
       from (values ${vals}) as v(id, pv, ts, cat) where a.id = v.id; commit;`,
    ], { env: { ...process.env, PGPASSWORD: "postgres" } });
    resetParams();
  }
});

test("8. koreksi massal: tetapkan status baru", async ({ page, context, baseURL }, info) => {
  desktopOnly(info);
  const sb = admin();
  let orig: { id: string; utilization: string | null }[] = [];
  try {
    await loginAs(context, ADMIN, baseURL!);
    await page.goto("/pengaturan?tab=review");
    await page.waitForLoadState("networkidle");
    const count = page.getByTestId("review-count");
    const before = Number((await count.innerText()).match(/dari ([\d.]+)/)![1].replace(/\./g, ""));
    const code = await page.getByTestId("review-list").locator("li").first().locator("span").first().innerText();
    orig = (await sb.from("assets").select("id,utilization").eq("asset_code", code)).data ?? [];
    expect(orig).toHaveLength(1);
    await page.getByTestId("review-list").getByRole("checkbox").first().click();
    await page.getByLabel("Status baru").selectOption("idle_kosong");
    await page.getByTestId("review-set").click();
    await page.getByRole("dialog").getByRole("button", { name: "Tetapkan status", exact: true }).click();
    await expect(page.getByText("1 aset diubah ke “Idle / kosong”")).toBeVisible();
    await expect(count).toContainText(`dari ${(before - 1).toLocaleString("id-ID")}`);
    const { data } = await sb.from("assets").select("utilization,utilization_needs_review").eq("id", orig[0].id).single();
    expect(data).toEqual({ utilization: "idle_kosong", utilization_needs_review: false });
  } finally {
    for (const o of orig) await sb.from("assets").update({ utilization: o.utilization, utilization_needs_review: true }).eq("id", o.id);
  }
});

test("9. alias pemanfaatan baru dipakai impor", async ({ page, context, baseURL }, info) => {
  desktopOnly(info);
  const ALIAS = "produktif-uji";
  const CODE = "UJI-ALIAS-2";
  const sb = admin();
  try {
    await loginAs(context, ADMIN, baseURL!);
    await page.goto("/pengaturan?tab=alias");
    await page.waitForLoadState("networkidle");
    const form = page.getByRole("form", { name: "Tambah alias pemanfaatan" });
    await form.getByLabel("Teks di Excel").fill(ALIAS);
    await form.getByLabel("Status baku").selectOption("idle_kosong");
    await form.getByRole("button", { name: "Simpan alias" }).click();
    await expect(page.getByTestId(`util-alias-${ALIAS}`)).toBeVisible();

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["MASTER"], [], [], ["ID Aset", "Nama Aset", "Jenis Aset", "Distrik", "Alamat", "Status Pemanfaatan"], [CODE, "Aset uji alias pemanfaatan", "Tanah", "JAWA BARAT", "Jl. Uji 1", ALIAS]]), "Master Aset");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["PENILAIAN"], [], [], ["ID Aset", "Tanggal Penilaian"]]), "Penilaian Risiko");
    const path = test.info().outputPath("alias-util.xlsx");
    XLSX.writeFile(wb, path);

    await page.goto("/import");
    await page.waitForLoadState("networkidle");
    await page.locator("#berkas").setInputFiles(path);
    await expect(page.getByRole("heading", { name: /Hasil pemeriksaan/ })).toBeVisible({ timeout: 30_000 });
    const main = page.locator("main");
    await expect(main).toContainText(/Ditolak: 0/);
    await expect(main).toContainText(`Status pemanfaatan "${ALIAS}" dibaca sebagai`);
    await page.getByRole("button", { name: "Lanjut ke konfirmasi" }).click();
    await page.getByRole("button", { name: /^Impor [\d.]+ baris$/ }).click();
    await expect(page.getByRole("heading", { name: "Impor selesai" })).toBeVisible({ timeout: 30_000 });
    const { data: a } = await sb.from("assets").select("utilization").eq("asset_code", CODE).single();
    expect(a?.utilization).toBe("idle_kosong");
  } finally {
    await sb.from("assets").delete().eq("asset_code", CODE);
    await sb.from("utilization_aliases").delete().eq("raw", ALIAS);
  }
});

test("10. edit rubrik draf tersimpan; hapus draf", async ({ page, context, baseURL }, info) => {
  desktopOnly(info);
  await loginAs(context, ADMIN, baseURL!);
  const n = await newDraft(page);
  const teks = `Uji rubrik ${Date.now()}`;
  await page.goto(`/pengaturan?tab=rubrik&versi=${n}`);
  await page.waitForLoadState("networkidle");
  await page.locator("#rb-legal-1").fill(teks);
  await page.getByRole("button", { name: "Simpan rubrik" }).click();
  await expect(page.getByText(`Rubrik draf versi ${n} disimpan (1 deskripsi)`)).toBeVisible();
  await page.reload();
  await expect(page.locator("#rb-legal-1")).toHaveValue(teks);

  await page.goto(`/pengaturan?tab=parameter&versi=${n}`);
  await page.getByRole("button", { name: "Hapus draf", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Hapus draf", exact: true }).click();
  await expect(page.getByText(`Draf versi ${n} dihapus`)).toBeVisible();
  await expect(page.getByTestId(`version-${n}`)).toHaveCount(0);
});
