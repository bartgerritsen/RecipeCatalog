"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import RecipeCard from "@/components/RecipeCard";
import { totalTime } from "@/lib/format";
import type { Recipe } from "@/lib/types";

type SortKey =
  | "name"
  | "kcal_desc"
  | "kcal_asc"
  | "protein_desc"
  | "carbs_desc"
  | "fat_desc"
  | "time_asc";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "name", label: "Naam A–Z" },
  { key: "kcal_desc", label: "Kcal ↓" },
  { key: "kcal_asc", label: "Kcal ↑" },
  { key: "protein_desc", label: "Eiwit ↓" },
  { key: "carbs_desc", label: "Koolhydraten ↓" },
  { key: "fat_desc", label: "Vet ↓" },
  { key: "time_asc", label: "Snelste eerst" },
];

interface MacroRange {
  kcalMax?: number;
  proteinMin?: number;
  carbsMax?: number;
  fatMax?: number;
}

export default function BrowseClient({ initial }: { initial: Recipe[] }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Recipe[] | null>(null); // API results when searching
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState<SortKey>("name");
  const [quick, setQuick] = useState<Set<string>>(new Set());
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [range, setRange] = useState<MacroRange>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Search (debounced) — hits the API which does DB + AH fallback.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/recipes/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setResults(data.recipes ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function toggleQuick(key: string) {
    setQuick((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const base = results ?? initial;

  const filtered = useMemo(() => {
    let list = base.slice();

    // quick filters
    if (quick.has("fast")) list = list.filter((r) => totalTime(r) > 0 && totalTime(r) <= 30);
    if (quick.has("protein")) list = list.filter((r) => (r.protein ?? 0) >= 30);
    if (quick.has("light")) list = list.filter((r) => (r.kcal ?? Infinity) <= 500);

    // advanced range
    if (range.kcalMax != null) list = list.filter((r) => (r.kcal ?? Infinity) <= range.kcalMax!);
    if (range.proteinMin != null)
      list = list.filter((r) => (r.protein ?? 0) >= range.proteinMin!);
    if (range.carbsMax != null) list = list.filter((r) => (r.carbs ?? Infinity) <= range.carbsMax!);
    if (range.fatMax != null) list = list.filter((r) => (r.fat ?? Infinity) <= range.fatMax!);

    // sort
    const by = (f: (r: Recipe) => number, dir = 1) => (a: Recipe, b: Recipe) =>
      (f(a) - f(b)) * dir;
    switch (sort) {
      case "name":
        list.sort((a, b) => a.title.localeCompare(b.title, "nl"));
        break;
      case "kcal_desc":
        list.sort(by((r) => r.kcal ?? -1, -1));
        break;
      case "kcal_asc":
        list.sort(by((r) => r.kcal ?? Infinity));
        break;
      case "protein_desc":
        list.sort(by((r) => r.protein ?? -1, -1));
        break;
      case "carbs_desc":
        list.sort(by((r) => r.carbs ?? -1, -1));
        break;
      case "fat_desc":
        list.sort(by((r) => r.fat ?? -1, -1));
        break;
      case "time_asc":
        list.sort(by((r) => totalTime(r) || Infinity));
        break;
    }
    return list;
  }, [base, quick, range, sort]);

  return (
    <div>
      <div className="stack" style={{ paddingTop: 16 }}>
        <input
          className="input"
          type="search"
          placeholder="Zoek recept of ingrediënt…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Zoeken"
        />

        <div className="row wrap">
          <select
            className="select"
            style={{ width: "auto" }}
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="Sorteren"
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>

          <button
            className="chip"
            aria-pressed={quick.has("fast")}
            onClick={() => toggleQuick("fast")}
          >
            ≤ 30 min
          </button>
          <button
            className="chip"
            aria-pressed={quick.has("protein")}
            onClick={() => toggleQuick("protein")}
          >
            ≥ 30 g eiwit
          </button>
          <button
            className="chip"
            aria-pressed={quick.has("light")}
            onClick={() => toggleQuick("light")}
          >
            ≤ 500 kcal
          </button>
          <button
            className="chip"
            aria-pressed={showAdvanced}
            aria-expanded={showAdvanced}
            onClick={() => setShowAdvanced((v) => !v)}
          >
            ⚙ Macro-filter
          </button>
        </div>

        {showAdvanced && (
          <div className="row wrap" style={{ gap: 8 }}>
            <NumInput
              label="Max kcal"
              value={range.kcalMax}
              onChange={(v) => setRange((r) => ({ ...r, kcalMax: v }))}
            />
            <NumInput
              label="Min eiwit"
              value={range.proteinMin}
              onChange={(v) => setRange((r) => ({ ...r, proteinMin: v }))}
            />
            <NumInput
              label="Max koolh."
              value={range.carbsMax}
              onChange={(v) => setRange((r) => ({ ...r, carbsMax: v }))}
            />
            <NumInput
              label="Max vet"
              value={range.fatMax}
              onChange={(v) => setRange((r) => ({ ...r, fatMax: v }))}
            />
            <button className="btn" onClick={() => setRange({})}>
              Reset
            </button>
          </div>
        )}

        <div className="result-count" aria-live="polite">
          {loading ? (
            <>
              <span className="spinner" /> Zoeken…
            </>
          ) : (
            `${filtered.length} recept${filtered.length === 1 ? "" : "en"}${
              results ? " (incl. Albert Heijn)" : ""
            }`
          )}
        </div>
      </div>

      {filtered.length === 0 && !loading ? (
        <div className="empty">Geen recepten gevonden. Probeer een andere zoekterm.</div>
      ) : (
        <div className="grid">
          {filtered.map((r) => (
            <RecipeCard key={r.id} recipe={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function NumInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: number;
  onChange: (v: number | undefined) => void;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
      <span className="muted">{label}</span>
      <input
        className="input"
        type="number"
        inputMode="numeric"
        style={{ width: 110 }}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
      />
    </label>
  );
}
