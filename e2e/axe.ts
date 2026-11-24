import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/** Gagal bila ada pelanggaran WCAG 2.2 AA; pesan memuat ringkasan per aturan. */
export async function expectNoA11yViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const ringkas = violations
    .map((v) => `${v.id} (${v.impact}): ${v.nodes.length} elemen, mis. ${v.nodes[0]?.target.join(" ")}`)
    .join("\n");
  expect(violations, `Pelanggaran a11y di ${page.url()}:\n${ringkas}`).toEqual([]);
}
