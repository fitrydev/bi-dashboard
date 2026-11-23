import { expect, test } from "@playwright/test";
import { loginAs } from "./session";

test.describe.configure({ mode: "serial" });

for (const scheme of ["light", "dark"] as const) {
  test(`/dashboard ${scheme}: angka kunci, filter, tanpa scroll horizontal & galat konsol`, async ({
    page,
    context,
    baseURL,
  }, info) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
    page.on("console", (m) => m.type() === "error" && errors.push(`console: ${m.text()}`));

    await page.emulateMedia({ colorScheme: scheme });
    await loginAs(context, "admin@example.com", baseURL!);
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("dari 136 aset");
    await expect(page.getByRole("link", { name: /Mulai penilaian/ })).toBeVisible();
    await expect(page.getByText("44 aset placeholder tidak dihitung")).toBeVisible();
    await expect(page.getByText(/Skor 47,0 · Medium/)).toBeVisible();
    await expect(page.locator("#tren")).toHaveCount(0); // periods < 2
    await page.waitForLoadState("networkidle");

    const w = await page.evaluate(() => ({
      s: document.documentElement.scrollWidth,
      c: document.documentElement.clientWidth,
    }));
    expect(w.s).toBeLessThanOrEqual(w.c);

    const kind = info.project.name === "mobile" ? "mobile" : "desktop";
    await page.screenshot({ path: `docs/screenshots/fase-5/dashboard-${kind}-${scheme}.png`, fullPage: true });

    // filter mengubah angka
    await page.goto("/dashboard?wilayah=JAWA%20BARAT");
    await expect(page.getByText(/Register risiko 12 aset/)).toBeVisible();
    expect(errors).toEqual([]);
  });
}
