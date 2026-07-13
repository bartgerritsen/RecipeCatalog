import { macroEnergy } from "@/lib/format";
import type { Recipe } from "@/lib/types";

export default function MacroBar({
  recipe,
}: {
  recipe: Pick<Recipe, "protein" | "carbs" | "fat">;
}) {
  const e = macroEnergy(recipe);
  const has = (recipe.protein ?? 0) + (recipe.carbs ?? 0) + (recipe.fat ?? 0) > 0;
  if (!has) return null;
  return (
    <div
      className="macrobar"
      role="img"
      aria-label={`Macroverdeling: ${Math.round(e.protein)}% eiwit, ${Math.round(
        e.carbs,
      )}% koolhydraten, ${Math.round(e.fat)}% vet`}
    >
      <span style={{ width: `${e.protein}%`, background: "var(--protein)" }} />
      <span style={{ width: `${e.carbs}%`, background: "var(--carbs)" }} />
      <span style={{ width: `${e.fat}%`, background: "var(--fat)" }} />
    </div>
  );
}

export function MacroLegend() {
  return (
    <div className="legend">
      <span>
        <i style={{ background: "var(--protein)" }} />
        Eiwit
      </span>
      <span>
        <i style={{ background: "var(--carbs)" }} />
        Koolhydraten
      </span>
      <span>
        <i style={{ background: "var(--fat)" }} />
        Vet
      </span>
    </div>
  );
}
