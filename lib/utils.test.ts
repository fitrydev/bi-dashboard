import { expect, test } from "vitest";
import { cn } from "./utils";

test("cn mempertahankan token ukuran font kustom di samping warna text-*", () => {
  expect(cn("text-title text-ink sm:text-display")).toBe("text-title text-ink sm:text-display");
  expect(cn("text-label text-status-warning-ink")).toBe("text-label text-status-warning-ink");
  expect(cn("text-body", "text-label")).toBe("text-label");
});
