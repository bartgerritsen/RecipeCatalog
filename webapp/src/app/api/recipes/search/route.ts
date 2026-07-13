import { NextRequest, NextResponse } from "next/server";
import { searchRecipes } from "@/lib/recipes/search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (q.trim().length < 2) {
    return NextResponse.json({ recipes: [] });
  }
  try {
    const recipes = await searchRecipes(q);
    return NextResponse.json({ recipes });
  } catch (e) {
    console.error("search error", e);
    return NextResponse.json({ error: "search_failed" }, { status: 500 });
  }
}
