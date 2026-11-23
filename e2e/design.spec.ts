import { expect, test } from "@playwright/test";
import { loginAs } from "./session";

test.describe.configure({ mode: "serial" });

for (const scheme of ["light", "dark"] as const) {
  test(`/design ${scheme}: heading, tanpa scroll horizontal, tanpa galat konsol`, async ({
    page,
    context,
    baseURL,
  }, info) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
    page.on("console", (m) => m.type() === "error" && errors.push(`console: ${m.text()}`));

    await page.emulateMedia({ colorScheme: scheme });
    await loginAs(context, "admin@example.com", baseURL!);
    await page.goto("/design");
    await expect(page.getByRole("heading", { level: 1, name: "Galeri komponen" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Kategori risiko" })).toBeVisible();
    await expect(page.locator("html")).toHaveClass(scheme === "dark" ? /dark/ : /^(?!.*dark)/);
    await page.waitForLoadState("networkidle");

    const w = await page.evaluate(() => ({
      s: document.documentElement.scrollWidth,
      c: document.documentElement.clientWidth,
    }));
    expect(w.s).toBeLessThanOrEqual(w.c);

    const kind = info.project.name === "mobile" ? "mobile" : "desktop";
    await page.screenshot({
      path: `docs/screenshots/fase-4/design-${kind}-${scheme}.png`,
      fullPage: true,
    });
    expect(errors).toEqual([]);
  });
}
