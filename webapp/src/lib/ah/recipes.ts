import { ahGraphQL } from "./client";

const RECIPE_SEARCH_QUERY = `
query SearchRecipes($searchText: String, $start: Int, $size: PageSize,
                    $sortBy: RecipeSearchSortOption) {
  recipeSearch(query: {searchText: $searchText, start: $start,
                       size: $size, sortBy: $sortBy}) {
    page { total hasNextPage }
    result {
      id title slug courses diet nutriScore
      time { cook oven wait }
      rating { average count }
      serving { number type }
      images(renditions: [D440X324]) { url }
      nutrition {
        energy { value }
        protein { value }
        carbohydrates { value }
        fat { value }
      }
    }
  }
}`;

const RECIPE_DETAILS_QUERY = `
query GetRecipe($id: Int!, $servings: Int) {
  recipe(id: $id, servings: $servings) {
    id title description courses cuisines
    cookTime ovenTime waitTime nutriScore
    rating { average count }
    servings { number type min max isChangeable }
    images(renditions: [D440X324, D1024X576]) { rendition url }
    ingredients {
      id quantity
      quantityUnit { singular plural }
      name { singular plural }
      text
    }
    preparation { steps summary }
    nutritions {
      energy { value }
      protein { value }
      carbohydrates { value }
      fat { value }
    }
  }
}`;

interface AhNutritionValue {
  value: number;
}
export interface AhNutrition {
  energy: AhNutritionValue | null;
  protein: AhNutritionValue | null;
  carbohydrates: AhNutritionValue | null;
  fat: AhNutritionValue | null;
}

export interface AhRecipeSummary {
  id: number;
  title: string;
  slug: string;
  courses: string[];
  diet: (string | null)[];
  nutriScore: string | null;
  time: { cook: number; oven: number | null; wait: number | null };
  rating: { average: number | null; count: number };
  serving: { number: number; type: string };
  images: { url: string | null }[];
  nutrition: AhNutrition | null;
}

export interface AhRecipeDetail {
  id: number;
  title: string;
  description: string;
  courses: string[];
  cuisines: string[] | null;
  cookTime: number;
  ovenTime: number | null;
  waitTime: number | null;
  nutriScore: string | null;
  rating: { average: number | null; count: number };
  servings: { number: number; type: string; min: number; max: number; isChangeable: boolean };
  images: { rendition: string; url: string | null }[];
  ingredients: {
    id: number;
    quantity: number | null;
    quantityUnit: { singular: string; plural: string | null } | null;
    name: { singular: string; plural: string | null };
    text: string | null;
  }[];
  preparation: { steps: string[]; summary: string[] };
  nutritions: AhNutrition | null;
}

export async function ahRecipeSearch(
  token: string,
  searchText: string,
  size = 20,
  start = 0,
  sortBy = "MOST_RELEVANT",
): Promise<{ total: number; result: AhRecipeSummary[] }> {
  const data = await ahGraphQL<{
    recipeSearch: { page: { total: number }; result: AhRecipeSummary[] };
  }>(token, RECIPE_SEARCH_QUERY, { searchText, size, start, sortBy });
  return { total: data.recipeSearch.page.total, result: data.recipeSearch.result };
}

export async function ahRecipeDetail(
  token: string,
  id: number,
  servings?: number,
): Promise<AhRecipeDetail> {
  const data = await ahGraphQL<{ recipe: AhRecipeDetail }>(token, RECIPE_DETAILS_QUERY, {
    id,
    servings: servings ?? null,
  });
  return data.recipe;
}

// --- AH's own ingredient -> product suggestions (chosen product + alternatives) ---

const PRODUCT_SUGGESTIONS_QUERY = `
query RecipeProducts($options: RecipeProductSuggestionV2Input!) {
  recipeProductSuggestionsV2(options: $options) {
    index
    optional
    ingredient { name completeText }
    productSuggestion {
      quantity
      product {
        id title brand salesUnitSize
        price { now { amount formatted } }
        imagePack { medium { url } }
      }
    }
    alternativeSections {
      title
      productSuggestions {
        quantity
        product {
          id title brand salesUnitSize
          price { now { amount formatted } }
          imagePack { medium { url } }
        }
      }
    }
  }
}`;

interface AhSuggProduct {
  id: number;
  title: string | null;
  brand: string | null;
  salesUnitSize: string | null;
  price: { now: { amount: number; formatted: string } | null } | null;
  imagePack: { medium: { url: string } | null }[] | null;
}
interface AhSuggestionRaw {
  index: number | null;
  optional: boolean;
  ingredient: { name: string | null; completeText: string | null };
  productSuggestion: { quantity: number; product: AhSuggProduct | null } | null;
  alternativeSections: {
    title: string;
    productSuggestions: { quantity: number; product: AhSuggProduct | null }[];
  }[];
}

export async function ahRecipeProductSuggestions(
  token: string,
  recipeId: number,
  servings?: number,
): Promise<AhSuggestionRaw[]> {
  const data = await ahGraphQL<{ recipeProductSuggestionsV2: AhSuggestionRaw[] }>(
    token,
    PRODUCT_SUGGESTIONS_QUERY,
    { options: { recipeId, numberOfServings: servings ?? null } },
  );
  return data.recipeProductSuggestionsV2 ?? [];
}

export type { AhSuggestionRaw, AhSuggProduct };
