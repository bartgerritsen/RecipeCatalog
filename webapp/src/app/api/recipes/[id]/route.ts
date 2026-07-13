import { NextRequest, NextResponse } from "next/server";
import { getRecipeById, RecipeGoneError } from "@/lib/recipes/detail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const recipe = await getRecipeById(id);
    if (!recipe) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ recipe });
  } catch (e) {
    if (e instanceof RecipeGoneError) {
      return NextResponse.json({ error: "gone" }, { status: 410 });
    }
    console.error("recipe detail error", e);
    return NextResponse.json({ error: "detail_failed" }, { status: 500 });
  }
}
