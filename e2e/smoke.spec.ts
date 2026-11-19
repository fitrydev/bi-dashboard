import { expect, test } from "@playwright/test";

test("login menampilkan judul dan tombol Google", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { level: 1, name: "Buku Besar Risiko" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Masuk dengan Google" })).toBeVisible();
});

for (const path of ["/login", "/dashboard"]) {
  test(`tanpa scroll horizontal di ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    );
    expect(overflow).toBe(true);
  });
}

test("tanpa error console di /dashboard", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");
  expect(errors).toEqual([]);
});
