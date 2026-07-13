import { createAdminClient } from "@/lib/supabase/admin";
import type { Recipe } from "@/lib/types";

/** All local recipes (the seeded groei-maatje set), for instant client filtering. */
export async function listLocalRecipes(): Promise<Recipe[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("recipes")
    .select("*")
    .eq("source", "local")
    .order("title", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Recipe[];
}

/** Recipes liked in the last `days` days, most-liked first (timeline). */
export async function listLikedRecipes(days = 7, max = 12): Promise<Recipe[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("liked_recipes", { days, max_results: max });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: { recipe: Recipe }) => row.recipe);
}

/** All-time most-favorited recipes. */
export async function listMostLiked(max = 12): Promise<Recipe[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("most_liked_recipes", { max_results: max });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: { recipe: Recipe }) => row.recipe);
}

/** Best-rated recipes (min number of ratings). */
export async function listTopRated(minCount = 20, max = 12): Promise<Recipe[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("top_rated_recipes", {
    min_count: minCount,
    max_results: max,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as Recipe[];
}

/** Fallback feed when there are few likes: top-rated / newest local recipes. */
export async function listFeatured(max = 12): Promise<Recipe[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("recipes")
    .select("*")
    .eq("source", "local")
    .order("rating_avg", { ascending: false, nullsFirst: false })
    .order("protein", { ascending: false, nullsFirst: false })
    .order("title", { ascending: true })
    .limit(max);
  if (error) throw new Error(error.message);
  return (data ?? []) as Recipe[];
}
