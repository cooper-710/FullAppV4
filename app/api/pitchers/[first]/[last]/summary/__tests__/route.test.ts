import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "../route";

describe("pitcher summary proxy", () => {
  const originalEnv = process.env.NEXT_PUBLIC_API_URL;

  afterEach(() => {
    process.env.NEXT_PUBLIC_API_URL = originalEnv;
    vi.resetAllMocks();
  });

  it("forwards the request to the upstream pitcher endpoint", async () => {
    process.env.NEXT_PUBLIC_API_URL = "https://example.com";
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response("{}", { status: 200, headers: { "content-type": "application/json" } })
    );

    const request = new NextRequest("http://localhost/api/pitchers/Gerrit/Cole/summary?seasons=2024");
    const res = await GET(request, { params: { first: "Gerrit", last: "Cole" } });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/pitchers/Gerrit/Cole/summary?seasons=2024",
      { cache: "no-store" }
    );
    expect(res.status).toBe(200);
  });
});
