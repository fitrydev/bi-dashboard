import { expect, test } from "@playwright/test";
import { expectNoA11yViolations } from "./axe";
import { loginAs } from "./session";

// Read-only: dijalankan di desktop (1440) dan mobile (375) lewat project Playwright.
const PUBLIC = ["/login", "/akses-ditolak"];
const AUTH = [
  "/dashboard",
  "/aset",
  "/aset/251116",
  "/aset/251116/nilai",
  "/aset/251116/monitoring",
  "/jadwal",
  "/jadwal?tampil=kalender",
  "/import",
  "/panduan",
  ...["pengguna", "parameter", "rubrik", "alias", "review"].map((t) => `/pengaturan?tab=${t}`),
];

for (const scheme of ["light", "dark"] as const)
  for (const path of [...PUBLIC, ...AUTH])
    test(`a11y ${path} ${scheme}`, async ({ page, context, baseURL }) => {
      await page.emulateMedia({ colorScheme: scheme });
      if (!PUBLIC.includes(path)) await loginAs(context, "admin@example.com", baseURL!);
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.waitForLoadState("networkidle");
      await expectNoA11yViolations(page);
    });
