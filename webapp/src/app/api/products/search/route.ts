import { NextRequest, NextResponse } from "next/server";
import { searchProductsCached } from "@/lib/products/search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Cached AH product search for the "browse alternative" popover. */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (q.trim().length < 2) return NextResponse.json({ products: [] });
  try {
    const products = await searchProductsCached(q);
    return NextResponse.json({ products });
  } catch (e) {
    console.error("product search error", e);
    return NextResponse.json({ error: "search_failed" }, { status: 500 });
  }
}
