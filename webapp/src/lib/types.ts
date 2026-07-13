export interface Ingredient {
  name: string;
  brand?: string;
  amount?: string;
  gServ?: number | null;
  unit?: string;
  kcal?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  optional?: boolean;
  seasoning?: boolean;
}

export interface Step {
  n: number;
  text: string;
}

/** Row shape returned by the DB / API to the UI. */
export interface Recipe {
  id: string;
  source: "local" | "ah";
  external_id: string;
  title: string;
  slug: string | null;
  description: string | null;
  servings: number | null;
  serving_type: string | null;
  prep_min: number | null;
  cook_min: number | null;
  oven_min: number | null;
  wait_min: number | null;
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  courses: string[] | null;
  diet: string[] | null;
  nutri_score: string | null;
  rating_avg: number | null;
  rating_count: number | null;
  image_url: string | null;
  ingredients: Ingredient[] | null;
  steps: Step[] | null;
  detail_fetched: boolean;
  expires_at: string | null;
}

/** Total prep+cook time in minutes. */
export function totalTime(r: Pick<Recipe, "prep_min" | "cook_min">): number {
  return (r.prep_min ?? 0) + (r.cook_min ?? 0);
}
