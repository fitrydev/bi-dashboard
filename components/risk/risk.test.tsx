import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DataWarning, IndicatorMeter, ScheduleStatus, ScoreValue, scheduleView } from "./index";
import { dueOf } from "@/lib/scoring";

describe("ScoreValue", () => {
  it("null: Belum dinilai, arsir, tanpa 0/low", () => {
    const { container } = render(<ScoreValue score={null} level="unrated" />);
    expect(screen.getByText("Belum dinilai")).toBeInTheDocument();
    expect(container.querySelector(".hatch-unrated")).not.toBeNull();
    expect(container.textContent).not.toMatch(/0|Low/);
    expect(container.innerHTML).not.toContain("risk-low");
  });
  it("47,0 format id-ID + Medium", () => {
    render(<ScoreValue score={47} level="medium" />);
    expect(screen.getByText("47,0")).toBeInTheDocument();
    expect(screen.getByText("Medium")).toBeInTheDocument();
  });
});

describe("IndicatorMeter", () => {
  it("indikator null = belum diketahui berarsir; terpilih menampilkan rubrik", () => {
    const { container } = render(
      <IndicatorMeter scores={{ legal: 4, control: null }} rubric={{ legal: ["a", "b", "c", "rubrik empat", "e"] }} />,
    );
    expect(screen.getByText("rubrik empat")).toBeInTheDocument();
    expect(screen.getAllByText("Belum diketahui")).toHaveLength(5); // control + 4 tak diisi
    expect(container.querySelectorAll(".hatch-unrated")).toHaveLength(5);
    expect(screen.getByText("bobot 25%")).toBeInTheDocument();
    expect(screen.getAllByRole("meter")).toHaveLength(1);
  });
});

describe("ScheduleStatus", () => {
  const today = new Date("2027-01-01T00:00:00Z");
  it("pemetaan status", () => {
    expect(scheduleView({ status: "tak-terjadwal" }).tone).toBe("none");
    expect(scheduleView(dueOf("2026-12-01", "critical", undefined, today)).tone).toBe("soon");
    expect(scheduleView(dueOf("2026-01-01", "critical", undefined, today)).tone).toBe("overdue");
    expect(scheduleView(dueOf("2026-12-31", "low", undefined, today)).tone).toBe("scheduled");
  });
  it("teks + ikon, bukan warna saja", () => {
    const { container } = render(<ScheduleStatus due={{ status: "tak-terjadwal" }} />);
    expect(screen.getByText("Belum ada jadwal")).toBeInTheDocument();
    expect(container.querySelector("svg[aria-hidden='true']")).not.toBeNull();
  });
});

describe("DataWarning", () => {
  it("kosong tidak render; terisi memakai label + aria", () => {
    expect(render(<DataWarning warnings={[]} />).container.firstChild).toBeNull();
    render(<DataWarning warnings={["alamat-kosong"]} variant="inline" />);
    expect(screen.getByText("Alamat kosong")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Peringatan data (1)" })).toBeInTheDocument();
  });
});
