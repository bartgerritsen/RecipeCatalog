import Link from "next/link";
import RecipeSection from "@/components/RecipeSection";
import {
  listLikedRecipes,
  listMostLiked,
  listTopRated,
  listFeatured,
} from "@/lib/recipes/list";
import type { Recipe } from "@/lib/types";

export const dynamic = "force-dynamic";

const safe = (p: Promise<Recipe[]>) => p.catch(() => [] as Recipe[]);

export default async function HomePage() {
  const [likedWeek, mostLiked, topRated, featured] = await Promise.all([
    safe(listLikedRecipes(7, 12)),
    safe(listMostLiked(12)),
    safe(listTopRated(20, 12)),
    safe(listFeatured(12)),
  ]);

  // "Ontdek" fills the page with recipes not already shown above.
  const shown = new Set([...likedWeek, ...mostLiked, ...topRated].map((r) => r.id));
  const discover = featured.filter((r) => !shown.has(r.id));

  const anySection =
    likedWeek.length > 0 || mostLiked.length > 0 || topRated.length > 0;

  return (
    <div style={{ paddingBottom: 40 }}>
      <section style={{ padding: "24px 0 4px" }}>
        <h1 style={{ margin: 0 }}>Tijdlijn</h1>
        <p className="muted" style={{ marginTop: 6 }}>
          {anySection
            ? "Ontdek wat anderen favoriet vinden."
            : "Populaire recepten om mee te beginnen. Bewaar recepten met ❤️ en ze verschijnen hier."}
        </p>
      </section>

      <div className="stack" style={{ gap: 26 }}>
        <RecipeSection
          title="🔥 Favoriet deze week"
          subtitle="Het meest bewaard in de afgelopen 7 dagen"
          recipes={likedWeek}
        />
        <RecipeSection
          title="❤️ Meest bewaard"
          subtitle="Aller-favorieten van iedereen"
          recipes={mostLiked}
        />
        <RecipeSection
          title="⭐ Best beoordeeld"
          subtitle="Hoogst gewaardeerde recepten"
          recipes={topRated}
        />
        <RecipeSection
          title={anySection ? "🍳 Ontdek meer" : "🍳 Aanbevolen"}
          recipes={discover}
        />
      </div>

      {likedWeek.length + mostLiked.length + topRated.length + discover.length === 0 && (
        <div className="empty">
          Nog geen recepten. <Link href="/browse">Blader door recepten →</Link>
        </div>
      )}
    </div>
  );
}
