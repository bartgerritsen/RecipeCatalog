import { createAdminClient } from "@/lib/supabase/admin";
import { getAnonToken } from "@/lib/ah/tokens";
import { ahRecipeProductSuggestions, type AhSuggProduct } from "@/lib/ah/recipes";
import { ahProductSearch, productImageUrl } from "@/lib/ah/products";
import { getRecipeById } from "@/lib/recipes/detail";
import { nextWeekStart } from "@/lib/time";
import type { Recipe } from "@/lib/types";

/** Normalized product shape used by the UI + cart. */
export interface ProductOption {
  productId: number;
  title: string;
  brand: string | null;
  salesUnitSize: string | null; // e.g. "500 g"
  priceFormatted: string | null; // e.g. "€ 3,69"
  priceAmount: number | null;
  quantity: number; // packs to buy for this ingredient
  imageUrl: string | null;
}

export interface IngredientSuggestion {
  index: number;
  ingredient: string;
  optional: boolean;
  chosen: ProductOption | null;
  alternatives: ProductOption[];
}

function mapAhProduct(p: AhSuggProduct | null, quantity = 1): ProductOption | null {
  if (!p) return null;
  return {
    productId: p.id,
    title: p.title ?? "",
    brand: p.brand ?? null,
    salesUnitSize: p.salesUnitSize ?? null,
    priceFormatted: p.price?.now?.formatted ?? null,
    priceAmount: p.price?.now?.amount ?? null,
    quantity: quantity || 1,
    imageUrl: p.imagePack?.[0]?.medium?.url ?? null,
  };
}

/** Build suggestions from AH's own recipe->product mapping. */
async function buildFromAh(token: string, recipe: Recipe): Promise<IngredientSuggestion[]> {
  const raw = await ahRecipeProductSuggestions(
    token,
    Number(recipe.external_id),
    recipe.servings ?? undefined,
  );
  return raw.map((s, i) => {
    const alts: ProductOption[] = [];
    for (const section of s.alternativeSections ?? []) {
      for (const ps of section.productSuggestions ?? []) {
        const opt = mapAhProduct(ps.product, ps.quantity);
        if (opt) alts.push(opt);
      }
    }
    return {
      index: s.index ?? i,
      ingredient: s.ingredient?.completeText || s.ingredient?.name || "",
      optional: s.optional,
      chosen: mapAhProduct(s.productSuggestion?.product ?? null, s.productSuggestion?.quantity),
      alternatives: alts,
    };
  });
}

/** Fallback for local recipes: search AH products per ingredient. */
async function buildFromSearch(token: string, recipe: Recipe): Promise<IngredientSuggestion[]> {
  const shoppable = (recipe.ingredients ?? []).filter((i) => i.name);
  const out: IngredientSuggestion[] = [];
  let index = 0;
  for (const ing of shoppable) {
    let products: ProductOption[] = [];
    try {
      const found = await ahProductSearch(token, ing.name, 6);
      products = found.map((p) => ({
        productId: p.webshopId,
        title: p.title,
        brand: p.brand ?? null,
        salesUnitSize: p.salesUnitSize ?? null,
        priceFormatted: p.priceBeforeBonus != null ? `€ ${p.priceBeforeBonus.toFixed(2).replace(".", ",")}` : null,
        priceAmount: p.priceBeforeBonus ?? null,
        quantity: 1,
        imageUrl: productImageUrl(p),
      }));
    } catch (e) {
      console.error("product search failed for", ing.name, e);
    }
    out.push({
      index: index++,
      ingredient: ing.amount || ing.name,
      optional: !!ing.optional,
      chosen: products[0] ?? null,
      alternatives: products.slice(1),
    });
  }
  return out;
}

/**
 * Get the shoppable product suggestions for a recipe, cached for a week.
 * AH recipes use AH's own ingredient->product mapping; local recipes fall back
 * to per-ingredient product search.
 */
export async function getRecipeSuggestions(
  recipeId: string,
  opts: { forceRefresh?: boolean } = {},
): Promise<{ recipe: Recipe; suggestions: IngredientSuggestion[] } | null> {
  const admin = createAdminClient();
  const recipe = await getRecipeById(recipeId);
  if (!recipe) return null;

  if (!opts.forceRefresh) {
    const { data: cached } = await admin
      .from("ah_recipe_products")
      .select("suggestions, expires_at")
      .eq("recipe_id", recipeId)
      .maybeSingle();
    if (cached && new Date(cached.expires_at).getTime() > Date.now()) {
      return { recipe, suggestions: cached.suggestions as IngredientSuggestion[] };
    }
  }

  const token = await getAnonToken();
  let suggestions: IngredientSuggestion[] = [];
  try {
    suggestions =
      recipe.source === "ah"
        ? await buildFromAh(token, recipe)
        : await buildFromSearch(token, recipe);
  } catch (e) {
    console.error("building suggestions failed:", e);
    // Local fallback if the AH mapping call fails for an AH recipe.
    if (recipe.source === "ah") suggestions = await buildFromSearch(token, recipe).catch(() => []);
  }

  await admin.from("ah_recipe_products").upsert(
    {
      recipe_id: recipeId,
      suggestions,
      fetched_at: new Date().toISOString(),
      expires_at: nextWeekStart(),
    },
    { onConflict: "recipe_id" },
  );

  return { recipe, suggestions };
}
