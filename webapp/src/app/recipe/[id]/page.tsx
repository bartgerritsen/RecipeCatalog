import { notFound } from "next/navigation";
import RecipeDetailClient from "./RecipeDetailClient";
import { getRecipeById, RecipeGoneError } from "@/lib/recipes/detail";
import { createClient } from "@/lib/supabase/server";
import { isConnected } from "@/lib/ah/tokens";
import type { Recipe } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function RecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let recipe: Recipe | null;
  try {
    recipe = await getRecipeById(id);
  } catch (e) {
    if (e instanceof RecipeGoneError) notFound();
    throw e;
  }
  if (!recipe) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let liked = false;
  let connected = false;
  if (user) {
    const [{ data: likeRow }, conn] = await Promise.all([
      supabase
        .from("recipe_likes")
        .select("recipe_id")
        .eq("user_id", user.id)
        .eq("recipe_id", id)
        .maybeSingle(),
      isConnected(user.id),
    ]);
    liked = !!likeRow;
    connected = conn;
  }

  return (
    <RecipeDetailClient
      recipe={recipe}
      initialLiked={liked}
      isConnected={connected}
      isLoggedIn={!!user}
    />
  );
}
