"use client";

import { useState } from "react";
import Link from "next/link";
import MacroBar, { MacroLegend } from "@/components/MacroBar";
import ShoppableProducts from "@/components/ShoppableProducts";
import { fmt } from "@/lib/format";
import type { Recipe } from "@/lib/types";

export default function RecipeDetailClient({
  recipe,
  initialLiked,
  isConnected,
  isLoggedIn,
}: {
  recipe: Recipe;
  initialLiked: boolean;
  isConnected: boolean;
  isLoggedIn: boolean;
}) {
  const baseServings = recipe.servings || 1;
  const [servings, setServings] = useState(baseServings);
  const [liked, setLiked] = useState(initialLiked);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [doneSteps, setDoneSteps] = useState<Set<number>>(new Set());

  const scale = servings / baseServings;
  const time = (recipe.prep_min ?? 0) + (recipe.cook_min ?? 0);

  async function toggleLike() {
    if (!isLoggedIn) {
      window.location.href = "/login?next=" + encodeURIComponent(`/recipe/${recipe.id}`);
      return;
    }
    const next = !liked;
    setLiked(next);
    await fetch("/api/likes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipeId: recipe.id, liked: next }),
    }).catch(() => setLiked(!next));
  }

  return (
    <article style={{ paddingBottom: 40 }}>
      <Link href="/browse" className="pill" style={{ margin: "16px 0 12px", display: "inline-block" }}>
        ← Terug
      </Link>

      {recipe.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={recipe.image_url}
          alt={recipe.title}
          style={{
            width: "100%",
            maxHeight: 360,
            objectFit: "cover",
            borderRadius: "var(--radius)",
          }}
        />
      )}

      <div className="row wrap" style={{ justifyContent: "space-between", marginTop: 16 }}>
        <h1 style={{ margin: 0 }}>{recipe.title}</h1>
        <button className="chip" aria-pressed={liked} onClick={toggleLike}>
          {liked ? "❤️ Bewaard" : "🤍 Bewaren"}
        </button>
      </div>

      {recipe.description && <p className="muted">{recipe.description}</p>}

      <div className="row wrap" style={{ gap: 16, color: "var(--ink-2)", fontSize: 14 }}>
        {time > 0 && <span>⏱ {time} min totaal</span>}
        {recipe.cook_min != null && <span>Koken: {recipe.cook_min} min</span>}
        {recipe.oven_min != null && <span>Oven: {recipe.oven_min} min</span>}
        {recipe.nutri_score && <span>NutriScore {recipe.nutri_score}</span>}
        {recipe.rating_avg != null && <span>⭐ {fmt(recipe.rating_avg)}</span>}
      </div>

      {/* Macros per serving */}
      {(recipe.kcal != null || recipe.protein != null) && (
        <>
          <h2 className="section-title">Voedingswaarde per portie</h2>
          <div className="macro-tiles">
            <div className="tile">
              <div className="val">{fmt(recipe.kcal)}</div>
              <div className="lbl">Calorieën</div>
            </div>
            <div className="tile">
              <div className="val" style={{ color: "var(--protein)" }}>
                {fmt(recipe.protein)}
              </div>
              <div className="lbl">Eiwit (g)</div>
            </div>
            <div className="tile">
              <div className="val" style={{ color: "var(--carbs)" }}>
                {fmt(recipe.carbs)}
              </div>
              <div className="lbl">Koolhydraten (g)</div>
            </div>
            <div className="tile">
              <div className="val" style={{ color: "var(--fat)" }}>
                {fmt(recipe.fat)}
              </div>
              <div className="lbl">Vet (g)</div>
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <MacroBar recipe={recipe} />
            <div style={{ marginTop: 8 }}>
              <MacroLegend />
            </div>
          </div>
        </>
      )}

      {/* Ingredients */}
      {recipe.ingredients?.length ? (
        <>
          <div className="row wrap" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <h2 className="section-title">Ingrediënten</h2>
            <div className="row" style={{ gap: 6 }}>
              <button
                className="icon-btn"
                onClick={() => setServings((s) => Math.max(1, s - 1))}
                aria-label="Minder porties"
              >
                −
              </button>
              <span style={{ minWidth: 90, textAlign: "center" }}>
                {servings} {recipe.serving_type || "porties"}
              </span>
              <button
                className="icon-btn"
                onClick={() => setServings((s) => Math.min(12, s + 1))}
                aria-label="Meer porties"
              >
                +
              </button>
            </div>
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }} className="stack">
            {recipe.ingredients.map((ing, i) => {
              const isChecked = checked.has(i);
              const grams = ing.gServ != null ? Math.round(ing.gServ * scale) : null;
              return (
                <li
                  key={i}
                  onClick={() =>
                    setChecked((prev) => {
                      const n = new Set(prev);
                      n.has(i) ? n.delete(i) : n.add(i);
                      return n;
                    })
                  }
                  className="row"
                  style={{
                    cursor: "pointer",
                    opacity: isChecked ? 0.5 : 1,
                    textDecoration: isChecked ? "line-through" : "none",
                    padding: "6px 0",
                    borderBottom: "1px solid var(--hairline)",
                  }}
                >
                  <input type="checkbox" checked={isChecked} readOnly />
                  <span className="grow">
                    {ing.name}
                    {ing.optional && <span className="muted"> (optioneel)</span>}
                  </span>
                  <span className="muted">
                    {grams != null ? `${grams} ${ing.unit || "g"}` : ing.amount}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}

      {/* Shoppable products: AH's own ingredient->product mapping, selectable */}
      <ShoppableProducts recipeId={recipe.id} isConnected={isConnected} isLoggedIn={isLoggedIn} />

      {/* Steps */}
      {recipe.steps?.length ? (
        <>
          <h2 className="section-title">Bereiding</h2>
          <ol style={{ paddingLeft: 0, listStyle: "none", margin: 0 }} className="stack">
            {recipe.steps.map((step) => {
              const done = doneSteps.has(step.n);
              return (
                <li
                  key={step.n}
                  onClick={() =>
                    setDoneSteps((prev) => {
                      const n = new Set(prev);
                      n.has(step.n) ? n.delete(step.n) : n.add(step.n);
                      return n;
                    })
                  }
                  className="row"
                  style={{
                    cursor: "pointer",
                    alignItems: "flex-start",
                    gap: 12,
                    opacity: done ? 0.5 : 1,
                    textDecoration: done ? "line-through" : "none",
                  }}
                >
                  <span className="pill" style={{ flexShrink: 0 }}>
                    {step.n}
                  </span>
                  <span>{step.text}</span>
                </li>
              );
            })}
          </ol>
        </>
      ) : null}
    </article>
  );
}
