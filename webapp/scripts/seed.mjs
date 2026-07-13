// Seed the 97 local (groei-maatje) recipes into Supabase.
// Usage: npm run seed   (reads env from .env.local via node --env-file)
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const data = JSON.parse(readFileSync(join(__dirname, "seed-data.json"), "utf8"));
console.log(`Seeding ${data.length} recipes…`);

const rows = data.map((r) => {
  const searchText = [
    r.name,
    r.desc,
    ...(r.ingredients ?? []).map((i) => i.name),
  ]
    .filter(Boolean)
    .join(" ");
  return {
    source: "local",
    external_id: r.id,
    title: r.name,
    slug: r.slug,
    description: r.desc,
    servings: r.servings ?? null,
    serving_type: r.servDesc ?? null,
    prep_min: r.prep ?? null,
    cook_min: r.cook ?? null,
    kcal: r.kcal ?? null,
    protein: r.protein ?? null,
    carbs: r.carbs ?? null,
    fat: r.fat ?? null,
    image_url: r.img ?? null,
    ingredients: r.ingredients ?? [],
    steps: r.steps ?? [],
    search_text: searchText,
    detail_fetched: true,
    expires_at: null,
    fetched_at: null,
  };
});

// Upsert in chunks.
const CHUNK = 50;
for (let i = 0; i < rows.length; i += CHUNK) {
  const chunk = rows.slice(i, i + CHUNK);
  const { error } = await supabase
    .from("recipes")
    .upsert(chunk, { onConflict: "source,external_id" });
  if (error) {
    console.error("Upsert failed:", error.message);
    process.exit(1);
  }
  console.log(`  upserted ${Math.min(i + CHUNK, rows.length)}/${rows.length}`);
}

console.log("Done ✅");
