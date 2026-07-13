import type { Ingredient, Step } from "@/lib/types";
import type { AhRecipeDetail, AhRecipeSummary } from "./recipes";

const AH_RECIPE_URL = (id: number, slug: string) =>
  `https://www.ah.nl/allerhande/recept/R-R${id}/${slug}`;

/** Best image URL from an AH images array. */
function pickImage(images: { url: string | null }[]): string | null {
  return images?.find((i) => i.url)?.url ?? null;
}

/** AH search summary -> partial `recipes` row (no ingredients/steps yet). */
export function summaryToRow(s: AhRecipeSummary) {
  return {
    source: "ah" as const,
    external_id: String(s.id),
    title: s.title,
    slug: s.slug,
    description: null,
    servings: s.serving?.number ?? null,
    serving_type: s.serving?.type ?? null,
    prep_min: null,
    cook_min: s.time?.cook ?? null,
    oven_min: s.time?.oven ?? null,
    wait_min: s.time?.wait ?? null,
    kcal: s.nutrition?.energy?.value ?? null,
    protein: s.nutrition?.protein?.value ?? null,
    carbs: s.nutrition?.carbohydrates?.value ?? null,
    fat: s.nutrition?.fat?.value ?? null,
    courses: s.courses ?? [],
    diet: (s.diet ?? []).filter(Boolean) as string[],
    nutri_score: s.nutriScore ?? null,
    rating_avg: s.rating?.average ?? null,
    rating_count: s.rating?.count ?? null,
    image_url: pickImage(s.images),
    ingredients: null,
    steps: null,
    search_text: s.title,
    detail_fetched: false,
    href: AH_RECIPE_URL(s.id, s.slug),
  };
}

function ingredientLine(i: AhRecipeDetail["ingredients"][number]): Ingredient {
  const unit = i.quantityUnit?.singular ?? "";
  const name = i.name.singular;
  const amount =
    i.text ??
    [i.quantity ?? "", unit, name].map((x) => String(x)).join(" ").trim();
  return { name, amount, unit, gServ: null, optional: false, seasoning: false };
}

/** AH full detail -> fields to update a `recipes` row with. */
export function detailToUpdate(d: AhRecipeDetail) {
  const ingredients: Ingredient[] = (d.ingredients ?? []).map(ingredientLine);
  const steps: Step[] = (d.preparation?.steps ?? []).map((text, idx) => ({
    n: idx + 1,
    text,
  }));
  return {
    description: d.description ?? null,
    courses: d.courses ?? [],
    cook_min: d.cookTime ?? null,
    oven_min: d.ovenTime ?? null,
    wait_min: d.waitTime ?? null,
    nutri_score: d.nutriScore ?? null,
    servings: d.servings?.number ?? null,
    serving_type: d.servings?.type ?? null,
    rating_avg: d.rating?.average ?? null,
    rating_count: d.rating?.count ?? null,
    kcal: d.nutritions?.energy?.value ?? null,
    protein: d.nutritions?.protein?.value ?? null,
    carbs: d.nutritions?.carbohydrates?.value ?? null,
    fat: d.nutritions?.fat?.value ?? null,
    ingredients,
    steps,
    search_text: [d.title, d.description, ...ingredients.map((i) => i.name)]
      .filter(Boolean)
      .join(" "),
    detail_fetched: true,
  };
}

/** Normalize an ingredient name for product-map lookups. */
export function normalizeIngredient(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
