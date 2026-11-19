import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RiskBadge } from "./RiskBadge";

describe("RiskBadge", () => {
  it("unrated: label Belum dinilai, arsir, tanpa warna low", () => {
    const { container } = render(<RiskBadge level="unrated" />);
    expect(screen.getByText("Belum dinilai")).toBeInTheDocument();
    const el = container.firstElementChild as HTMLElement;
    expect(el).toHaveClass("hatch-unrated");
    expect(el.getAttribute("style") ?? "").not.toContain("risk-low");
    expect(container.innerHTML).not.toContain("risk-low");
    // marker unrated = kotak putus-putus, bukan cincin low
    expect(container.querySelector("rect[stroke-dasharray]")).not.toBeNull();
    expect(container.querySelector("circle")).toBeNull();
  });
  it("low: label Low dan warna low", () => {
    const { container } = render(<RiskBadge level="low" />);
    expect(screen.getByText("Low")).toBeInTheDocument();
    expect(container.innerHTML).toContain("risk-low");
  });
});
