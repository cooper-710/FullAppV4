import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import PitchersDeepDiveSearch from "../PitchersDeepDiveSearch";

const mockSummary = {
  fangraphs: [
    {
      season: "2024",
      data: {
        Season: "2024",
        IP: 180.2,
        G: 30,
        GS: 30,
        W: 17,
        L: 6,
        SV: 0,
        HLD: 0,
        CG: 1,
        SHO: 1,
        TBF: 720,
        Pitches: 2900,
        ERA: 2.85,
        WHIP: 1.05,
        "K/9": 10.3,
        "BB/9": 2.4,
        "K%": 0.29,
        "BB%": 0.07,
        "CSW%": 0.32,
        "SwStr%": 0.14,
        "Zone%": 0.47,
        "Contact%": 0.73,
        "O-Swing%": 0.33,
        FIP: 3.1,
        xFIP: 3.2,
        SIERA: 3.1,
        "HR/9": 0.9,
        "HR/FB": 0.12,
        "ERA-": 65,
        "FIP-": 72,
        "xFIP-": 74,
        "LOB%": 0.79,
        "GB%": 0.46,
        "HardHit%": 0.33,
        BABIP: 0.278,
        "LD%": 0.21,
        "FB%": 0.33,
        "IFFB%": 0.09,
        "Pull%": 0.37,
        "Cent%": 0.39,
        "Oppo%": 0.24,
        "FF%": 0.41,
        "SL%": 0.22,
        "CU%": 0.09,
        "CH%": 0.14,
        "SI%": 0.14,
        WAR: 5.2,
        "RA9-WAR": 6.1,
        RAR: 62,
        WPA: 5.1,
        RE24: 28,
        SD: 28,
        MD: 2,
        Dollars: 42,
      },
    },
  ],
};

describe("PitchersDeepDiveSearch", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("calls the pitcher summary endpoint with seasons", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue({
      json: async () => mockSummary,
    } as any);

    render(<PitchersDeepDiveSearch />);

    const input = screen.getByPlaceholderText(/first last/i);
    fireEvent.change(input, { target: { value: "Gerrit Cole" } });
    fireEvent.click(screen.getByRole("button", { name: /search/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    expect(fetchMock.mock.calls[0]?.[0]).toContain("/api/pitchers/Gerrit/Cole/summary?seasons=2025");

    await screen.findByText("Production");
    const warCells = await screen.findAllByText("5.2");
    expect(warCells.length).toBeGreaterThan(0);
  });

  it("passes selected seasons to the query string", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue({
      json: async () => mockSummary,
    } as any);

    render(<PitchersDeepDiveSearch />);

    const input = screen.getByPlaceholderText(/first last/i);
    fireEvent.change(input, { target: { value: "Corbin Burnes" } });

    fireEvent.click(screen.getByRole("button", { name: "2024" }));
    fireEvent.click(screen.getByRole("button", { name: /search/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    const url = String(fetchMock.mock.calls[0]?.[0]);
    expect(url).toContain("seasons=2024");
    expect(url).toContain("seasons=2025");
  });
});
