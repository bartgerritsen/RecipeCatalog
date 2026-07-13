import type { Recipe } from "./types";

const nf = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 1 });

export function num(n: number | null | undefined, digits = 0): string {
  if (n == null) return "–";
  return new Intl.NumberFormat("nl-NL", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(n);
}

export function fmt(n: number | null | undefined): string {
  return n == null ? "–" : nf.format(n);
}

export function totalTime(r: Pick<Recipe, "prep_min" | "cook_min">): number {
  return (r.prep_min ?? 0) + (r.cook_min ?? 0);
}

/** Macro energy split (kcal from each macro), for the distribution bar. */
export function macroEnergy(r: Pick<Recipe, "protein" | "carbs" | "fat">) {
  const p = (r.protein ?? 0) * 4;
  const c = (r.carbs ?? 0) * 4;
  const f = (r.fat ?? 0) * 9;
  const total = p + c + f || 1;
  return {
    protein: (p / total) * 100,
    carbs: (c / total) * 100,
    fat: (f / total) * 100,
  };
}

export function compareByName(a: string, b: string): number {
  return a.localeCompare(b, "nl");
}
