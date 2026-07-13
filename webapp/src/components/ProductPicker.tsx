"use client";

import { useEffect, useRef, useState } from "react";

export interface ProductOption {
  productId: number;
  title: string;
  brand: string | null;
  salesUnitSize: string | null;
  priceFormatted: string | null;
  priceAmount: number | null;
  quantity: number;
  imageUrl: string | null;
}

/** One-line product label: "Calvé Pindakaas · 900 g · € 5,99". */
export function productLabel(p: ProductOption): string {
  return [p.brand && p.title.startsWith(p.brand) ? p.title : [p.brand, p.title].filter(Boolean).join(" "), p.salesUnitSize, p.priceFormatted]
    .filter(Boolean)
    .join(" · ");
}

/**
 * Popover to choose a different product for an ingredient. Shows the AH-provided
 * alternatives first, plus a free-text search that hits /api/products/search.
 */
export default function ProductPicker({
  alternatives,
  onPick,
  onClose,
}: {
  alternatives: ProductOption[];
  onPick: (p: ProductOption) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ProductOption[] | null>(null);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [onClose]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSearchResults(null);
      return;
    }
    setLoading(true);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setSearchResults(data.products ?? []);
      } catch {
        setSearchResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
  }, [query]);

  const list = searchResults ?? alternatives;

  return (
    <div ref={ref} className="popover" role="dialog" aria-label="Kies een ander product">
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
        <strong style={{ fontSize: 14 }}>Kies een product</strong>
        <button className="icon-btn" onClick={onClose} aria-label="Sluiten" style={{ width: 28, height: 28 }}>
          ×
        </button>
      </div>
      <input
        className="input"
        placeholder="Zoek een ander product…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />
      <div className="popover-list">
        {loading && (
          <div className="muted" style={{ padding: 8 }}>
            <span className="spinner" /> Zoeken…
          </div>
        )}
        {!loading && list.length === 0 && (
          <div className="muted" style={{ padding: 8 }}>
            {searchResults ? "Geen producten gevonden." : "Geen alternatieven beschikbaar."}
          </div>
        )}
        {list.map((p) => (
          <button key={p.productId} className="popover-item" onClick={() => onPick(p)}>
            {p.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="prod-thumb" src={p.imageUrl} alt="" loading="lazy" />
            ) : (
              <span className="prod-thumb" aria-hidden />
            )}
            <span className="grow">
              <span style={{ fontWeight: 600 }}>{p.title}</span>
              <br />
              <span className="muted" style={{ fontSize: 12 }}>
                {[p.brand, p.salesUnitSize].filter(Boolean).join(" · ")}
              </span>
            </span>
            <span style={{ fontWeight: 600 }}>{p.priceFormatted ?? ""}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
