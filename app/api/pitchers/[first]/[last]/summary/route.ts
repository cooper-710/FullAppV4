import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: { first: string; last: string } }) {
  const base = process.env.NEXT_PUBLIC_API_URL || "";
  const qs = req.nextUrl.searchParams.toString();
  const target = `${base}/pitchers/${encodeURIComponent(params.first)}/${encodeURIComponent(params.last)}/summary${qs ? `?${qs}` : ""}`;
  try {
    const res = await fetch(target, { cache: "no-store" });
    const body = await res.text();
    return new NextResponse(body, {
      status: res.status,
      headers: { "content-type": res.headers.get("content-type") || "application/json" },
    });
  } catch (error: any) {
    const message = error?.message || "Upstream error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
