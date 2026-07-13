"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Profile {
  goal_kcal: number | null;
  goal_protein: number | null;
  goal_carbs: number | null;
  goal_fat: number | null;
}
interface Favorite {
  ingredient_norm: string;
  product_title: string | null;
  webshop_id: number | null;
}

export default function ProfileClient({
  email,
  profile,
  favorites,
}: {
  email: string;
  profile: Profile | null;
  favorites: Favorite[];
}) {
  const router = useRouter();
  const [goals, setGoals] = useState({
    goal_kcal: profile?.goal_kcal ?? "",
    goal_protein: profile?.goal_protein ?? "",
    goal_carbs: profile?.goal_carbs ?? "",
    goal_fat: profile?.goal_fat ?? "",
  });
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function saveGoals() {
    setBusy(true);
    setSaved(false);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const toNum = (v: string | number) => (v === "" ? null : Number(v));
    await supabase.from("profiles").update({
      goal_kcal: toNum(goals.goal_kcal),
      goal_protein: toNum(goals.goal_protein),
      goal_carbs: toNum(goals.goal_carbs),
      goal_fat: toNum(goals.goal_fat),
      updated_at: new Date().toISOString(),
    }).eq("user_id", user.id);
    setBusy(false);
    setSaved(true);
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const field = (key: keyof typeof goals, label: string) => (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span className="muted" style={{ fontSize: 13 }}>
        {label}
      </span>
      <input
        className="input"
        type="number"
        inputMode="numeric"
        value={goals[key]}
        onChange={(e) => setGoals((g) => ({ ...g, [key]: e.target.value }))}
      />
    </label>
  );

  return (
    <div style={{ paddingBottom: 40, maxWidth: 560 }}>
      <h1>Profiel</h1>
      <p className="muted">{email}</p>

      <h2 className="section-title">Macrodoelen (per dag)</h2>
      <p className="muted" style={{ fontSize: 14, marginTop: 0 }}>
        Gebruikt om recepten voor jou te rangschikken.
      </p>
      <div className="macro-tiles" style={{ gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
        {field("goal_kcal", "Calorieën")}
        {field("goal_protein", "Eiwit (g)")}
        {field("goal_carbs", "Koolhydraten (g)")}
        {field("goal_fat", "Vet (g)")}
      </div>
      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn primary" onClick={saveGoals} disabled={busy}>
          {busy ? <span className="spinner" /> : "Opslaan"}
        </button>
        {saved && <span className="muted">Opgeslagen ✓</span>}
      </div>

      <h2 className="section-title">Favoriete producten</h2>
      {favorites.length === 0 ? (
        <p className="muted" style={{ fontSize: 14 }}>
          Nog geen favorieten. Wanneer je bij het toevoegen aan je mandje een product corrigeert,
          onthouden we die keuze voor dat ingrediënt.
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }} className="stack">
          {favorites.map((f) => (
            <li
              key={f.ingredient_norm}
              className="row"
              style={{ borderBottom: "1px solid var(--hairline)", padding: "8px 0" }}
            >
              <span className="grow">{f.ingredient_norm}</span>
              <span className="muted">{f.product_title ?? "–"}</span>
            </li>
          ))}
        </ul>
      )}

      <h2 className="section-title">Account</h2>
      <button className="btn" onClick={signOut}>
        Uitloggen
      </button>
    </div>
  );
}
