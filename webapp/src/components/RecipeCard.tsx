import Link from "next/link";
import MacroBar from "./MacroBar";
import { fmt, totalTime } from "@/lib/format";
import type { Recipe } from "@/lib/types";

export default function RecipeCard({ recipe }: { recipe: Recipe }) {
  const time = totalTime(recipe);
  return (
    <Link href={`/recipe/${recipe.id}`} className="card">
      {recipe.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="card-img"
          src={recipe.image_url}
          alt={recipe.title}
          loading="lazy"
        />
      ) : (
        <div className="card-img" aria-hidden />
      )}
      <div className="card-body">
        <div className="card-title">{recipe.title}</div>
        {recipe.description && <div className="card-desc">{recipe.description}</div>}
        <MacroBar recipe={recipe} />
        <div className="meta-row">
          {time > 0 && (
            <span>
              ⏱ <b>{time}</b> min
            </span>
          )}
          {recipe.kcal != null && (
            <span>
              🔥 <b>{fmt(recipe.kcal)}</b> kcal
            </span>
          )}
          {recipe.protein != null && (
            <span>
              💪 <b>{fmt(recipe.protein)}</b> g
            </span>
          )}
          {recipe.source === "ah" && <span className="pill">AH</span>}
        </div>
      </div>
    </Link>
  );
}
