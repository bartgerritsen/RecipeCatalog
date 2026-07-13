import { createAdminClient } from "@/lib/supabase/admin";
import { getAnonToken } from "@/lib/ah/tokens";
import { ahRecipeDetail } from "@/lib/ah/recipes";
import { detailToUpdate } from "@/lib/ah/mappers";
import { nextWeekStart } from "@/lib/time";
import type { Recipe } from "@/lib/types";

export class RecipeGoneError extends Error {}

/**
 * Fetch a recipe by internal id. For AH recipes without full detail (or with
 * expired cache), lazily fetch `recipe(id)` from AH, fill ingredients/steps,
 * and refresh the cache window. Local recipes are returned as-is.
 * Throws RecipeGoneError if an expired AH recipe cannot be refreshed.
 */
export async function getRecipeById(id: string): Promise<Recipe | null> {
  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from("recipes")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) return null;

  const r = row as Recipe & { fetched_at: string | null };

  if (r.source === "local") return r;

  const expired = r.expires_at ? new Date(r.expires_at).getTime() < Date.now() : true;
  const needsDetail = !r.detail_fetched;

  if (!expired && !needsDetail) return r;

  // Lazily (re)fetch AH detail.
  try {
    const token = await getAnonToken();
    const detail = await ahRecipeDetail(token, Number(r.external_id));
    const update = detailToUpdate(detail);
    const now = Date.now();
    const { data: updated, error: upErr } = await admin
      .from("recipes")
      .update({
        ...update,
        fetched_at: new Date(now).toISOString(),
        expires_at: nextWeekStart(),
        updated_at: new Date(now).toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();
    if (upErr) throw new Error(upErr.message);
    return updated as Recipe;
  } catch (e) {
    if (expired) {
      // Outdated and can't refresh -> treat as gone (do not show stale data).
      throw new RecipeGoneError("Recipe expired and could not be refreshed");
    }
    // Not expired but detail fetch failed -> return the summary we have.
    console.error("lazy detail fetch failed:", e);
    return r;
  }
}
