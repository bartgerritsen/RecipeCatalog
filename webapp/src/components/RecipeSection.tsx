import RecipeCard from "./RecipeCard";
import type { Recipe } from "@/lib/types";

export default function RecipeSection({
  title,
  subtitle,
  recipes,
}: {
  title: string;
  subtitle?: string;
  recipes: Recipe[];
}) {
  if (recipes.length === 0) return null;
  return (
    <section>
      <div className="section-title" style={{ marginBottom: 2 }}>
        {title}
      </div>
      {subtitle && (
        <p className="muted" style={{ fontSize: 13, marginTop: 0, marginBottom: 6 }}>
          {subtitle}
        </p>
      )}
      <div className="grid">
        {recipes.map((r) => (
          <RecipeCard key={`${title}-${r.id}`} recipe={r} />
        ))}
      </div>
    </section>
  );
}
