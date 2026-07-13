"use client";

import { useState } from "react";
import ProductPicker, { type ProductOption } from "./ProductPicker";

interface Suggestion {
  index: number;
  ingredient: string;
  optional: boolean;
  chosen: ProductOption | null;
  alternatives: ProductOption[];
}

interface RowState {
  included: boolean;
  chosen: ProductOption | null;
}

export default function ShoppableProducts({
  recipeId,
  isConnected,
  isLoggedIn,
}: {
  recipeId: string;
  isConnected: boolean;
  isLoggedIn: boolean;
}) {
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [rows, setRows] = useState<Record<number, RowState>>({});
  const [loading, setLoading] = useState(false);
  const [openPicker, setOpenPicker] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/recipes/${recipeId}/products`);
      const data = await res.json();
      const sugg: Suggestion[] = data.suggestions ?? [];
      setSuggestions(sugg);
      const init: Record<number, RowState> = {};
      for (const s of sugg) {
        // default: include non-optional ingredients that have a product
        init[s.index] = { included: !s.optional && !!s.chosen, chosen: s.chosen };
      }
      setRows(init);
    } catch {
      setMsg("Kon de producten niet laden.");
    } finally {
      setLoading(false);
    }
  }

  function toggle(index: number) {
    setRows((r) => ({ ...r, [index]: { ...r[index], included: !r[index].included } }));
  }

  function pick(index: number, p: ProductOption) {
    setRows((r) => ({ ...r, [index]: { included: true, chosen: p } }));
    setOpenPicker(null);
  }

  async function addToCart() {
    const items = Object.values(rows)
      .filter((r) => r.included && r.chosen)
      .map((r) => ({ productId: r.chosen!.productId, quantity: r.chosen!.quantity || 1 }));
    if (items.length === 0) {
      setMsg("Selecteer minstens één product.");
      return;
    }
    setAdding(true);
    setMsg(null);
    try {
      const res = await fetch("/api/cart/add-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (res.status === 409) setMsg("Verbind eerst je Albert Heijn account.");
      else if (!res.ok) setMsg("Toevoegen mislukt. Probeer het later opnieuw.");
      else setMsg(`✓ ${data.addedProducts} product(en) toegevoegd aan je mandje.`);
    } catch {
      setMsg("Toevoegen mislukt.");
    } finally {
      setAdding(false);
    }
  }

  if (!suggestions) {
    return (
      <div style={{ marginTop: 20 }}>
        <button className="btn primary block" onClick={load} disabled={loading}>
          {loading ? <span className="spinner" /> : "🛒 Boodschappen samenstellen"}
        </button>
        {!isConnected && (
          <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
            Verbind je Albert Heijn account om toe te voegen aan je mandje.
          </p>
        )}
        {msg && <p style={{ fontSize: 14, marginTop: 8 }}>{msg}</p>}
      </div>
    );
  }

  const selectedCount = Object.values(rows).filter((r) => r.included && r.chosen).length;

  return (
    <div style={{ marginTop: 20 }}>
      <h2 className="section-title">Boodschappen</h2>
      <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
        Albert Heijn koppelt zelf een product aan elk ingrediënt. Vink aan wat je wilt toevoegen,
        of kies een ander product.
      </p>
      <div>
        {suggestions.map((s) => {
          const row = rows[s.index];
          const chosen = row?.chosen;
          return (
            <div key={s.index} className="shop-row">
              <input
                type="checkbox"
                checked={row?.included ?? false}
                onChange={() => toggle(s.index)}
                aria-label={`${s.ingredient} toevoegen`}
              />
              {chosen?.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="prod-thumb" src={chosen.imageUrl} alt="" loading="lazy" />
              ) : (
                <span className="prod-thumb" aria-hidden />
              )}
              <div className="grow">
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  {s.ingredient}
                  {s.optional && <span className="muted"> (optioneel)</span>}
                </div>
                <div className="prod">
                  {chosen ? (
                    <>
                      {chosen.quantity > 1 && <b>{chosen.quantity}× </b>}
                      <b>{chosen.title}</b>
                      {chosen.salesUnitSize ? ` · ${chosen.salesUnitSize}` : ""}
                      {chosen.priceFormatted ? ` · ${chosen.priceFormatted}` : ""}
                    </>
                  ) : (
                    <span className="muted">Geen product gevonden</span>
                  )}
                </div>
              </div>
              <button
                className="pill"
                onClick={() => setOpenPicker(openPicker === s.index ? null : s.index)}
              >
                Wijzig
              </button>
              {openPicker === s.index && (
                <ProductPicker
                  alternatives={s.alternatives}
                  onPick={(p) => pick(s.index, p)}
                  onClose={() => setOpenPicker(null)}
                />
              )}
            </div>
          );
        })}
      </div>

      <button
        className="btn primary block"
        onClick={addToCart}
        disabled={adding || selectedCount === 0}
        style={{ marginTop: 14 }}
      >
        {adding ? (
          <span className="spinner" />
        ) : (
          `In mandje (${selectedCount} product${selectedCount === 1 ? "" : "en"})`
        )}
      </button>
      {!isConnected && (
        <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
          {isLoggedIn
            ? "Verbind je Albert Heijn account op de Albert Heijn-pagina."
            : "Log in en verbind je Albert Heijn account om toe te voegen."}
        </p>
      )}
      {msg && (
        <p style={{ fontSize: 14, marginTop: 8 }} aria-live="polite">
          {msg}
        </p>
      )}
    </div>
  );
}
