import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST { recipeId, liked } — toggle a like for the current user (RLS-guarded). */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const recipeId = String(body.recipeId ?? "");
  const liked = Boolean(body.liked);
  if (!recipeId) return NextResponse.json({ error: "missing_recipeId" }, { status: 400 });

  if (liked) {
    const { error } = await supabase
      .from("recipe_likes")
      .upsert({ user_id: user.id, recipe_id: recipeId });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } else {
    const { error } = await supabase
      .from("recipe_likes")
      .delete()
      .eq("user_id", user.id)
      .eq("recipe_id", recipeId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true, liked });
}
