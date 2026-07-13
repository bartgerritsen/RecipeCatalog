import { NextRequest, NextResponse } from "next/server";
import { getRecipeSuggestions } from "@/lib/cart/suggestions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** AH's shoppable product suggestions for a recipe (chosen + alternatives), cached 7d. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const forceRefresh = req.nextUrl.searchParams.get("refresh") === "1";
  try {
    const res = await getRecipeSuggestions(id, { forceRefresh });
    if (!res) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ suggestions: res.suggestions });
  } catch (e) {
    console.error("recipe products error", e);
    return NextResponse.json({ error: "products_failed" }, { status: 500 });
  }
}
