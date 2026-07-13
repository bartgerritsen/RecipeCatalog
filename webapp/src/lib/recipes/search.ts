import { createAdminClient } from "@/lib/supabase/admin";
import { getAnonToken } from "@/lib/ah/tokens";
import { ahRecipeSearch } from "@/lib/ah/recipes";
import { summaryToRow } from "@/lib/ah/mappers";
import { nextWeekStart } from "@/lib/time";
import type { Recipe } from "@/lib/types";

const MIN_HITS = 5; // >= this many local hits -> no AH call
const AH_FETCH_SIZE = 20;

export function normalizeQuery(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, " ");
}

async function dbSearch(qNorm: string, limit = 20): Promise<Recipe[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("search_recipes", { q: qNorm, max_results: limit });
  if (error) throw new Error(`search_recipes RPC: ${error.message}`);
  return (data ?? []) as Recipe[];
}

async function dbVisibleCount(qNorm: string): Promise<number> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("count_visible_recipes", { q: qNorm });
  if (error) throw new Error(`count_visible_recipes RPC: ${error.message}`);
  return (data as number) ?? 0;
}

/** Merge local text matches (first) with AH's own-ranked results; dedupe. */
function merge(dbResults: Recipe[], ahOrdered: Recipe[], limit = 20): Recipe[] {
  const seenIds = new Set<string>();
  const seenTitles = new Set<string>();
  const out: Recipe[] = [];
  const add = (r: Recipe) => {
    const t = r.title.toLowerCase();
    if (seenIds.has(r.id) || seenTitles.has(t)) return;
    seenIds.add(r.id);
    seenTitles.add(t);
    out.push(r);
  };
  dbResults.forEach(add);
  ahOrdered.forEach(add);
  return out.slice(0, limit);
}

/** Load AH recipe rows by external id, in the given order. */
async function loadAhByIds(extIds: string[]): Promise<Recipe[]> {
  if (extIds.length === 0) return [];
  const admin = createAdminClient();
  const { data } = await admin
    .from("recipes")
    .select("*")
    .eq("source", "ah")
    .in("external_id", extIds)
    .gt("expires_at", new Date().toISOString()); // hide expired
  const order = new Map(extIds.map((id, i) => [id, i]));
  return ((data ?? []) as Recipe[]).sort(
    (a, b) => (order.get(a.external_id) ?? 0) - (order.get(b.external_id) ?? 0),
  );
}

/**
 * DB-first search with AH fallback and aggressive caching.
 *
 *  1. If a fresh query-cache entry exists, serve from it (local matches + the
 *     AH result set we stored for this exact query). No AH call.
 *  2. Else if >= MIN_HITS local matches, return them. No AH call.
 *  3. Else fetch 20 from AH once, cache the recipes (7d) AND the query->results
 *     mapping (7d, empty = a genuine miss), and return the merged set.
 *
 * The query cache is what makes multi-word terms cache correctly: our Dutch FTS
 * may not re-match AH titles (e.g. "Sushibowl" vs "sushi bowl"), so we remember
 * AH's own answer instead of trying to reconstruct it.
 */
export async function searchRecipes(query: string): Promise<Recipe[]> {
  const qNorm = normalizeQuery(query);
  if (qNorm.length < 2) return [];

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  // 1. Fresh query cache?
  const { data: qc } = await admin
    .from("ah_query_cache")
    .select("recipe_ext_ids, expires_at")
    .eq("query_norm", qNorm)
    .maybeSingle();

  if (qc && new Date(qc.expires_at).getTime() > Date.now()) {
    const dbResults = await dbSearch(qNorm);
    const ahRows = await loadAhByIds((qc.recipe_ext_ids ?? []) as string[]);
    return merge(dbResults, ahRows);
  }

  // 2. Enough local hits?
  if ((await dbVisibleCount(qNorm)) >= MIN_HITS) return dbSearch(qNorm);

  // 3. Fall back to AH. Claim first (short TTL) to guard against a stampede;
  //    a concurrent request will see an unexpired empty entry and just serve
  //    local results until this one finishes. The upsert is idempotent anyway.
  const claimIso = new Date(Date.now() + 15_000).toISOString();
  const { error: claimErr } = await admin
    .from("ah_query_cache")
    .upsert(
      { query_norm: qNorm, recipe_ext_ids: [], expires_at: claimIso },
      { onConflict: "query_norm" },
    );
  if (claimErr) return dbSearch(qNorm);

  let freshIds: string[] = [];
  try {
    const token = await getAnonToken();
    const { result } = await ahRecipeSearch(token, qNorm, AH_FETCH_SIZE);
    const expIso = nextWeekStart();

    if (result.length > 0) {
      const rows = result.map((s) => {
        const { href, ...row } = summaryToRow(s);
        return { ...row, fetched_at: nowIso, expires_at: expIso };
      });
      const { error } = await admin
        .from("recipes")
        .upsert(rows, { onConflict: "source,external_id" });
      if (error) throw new Error(`recipe cache upsert: ${error.message}`);
      freshIds = result.map((s) => String(s.id));
    }

    // Store the query -> results mapping (empty array = genuine miss).
    await admin
      .from("ah_query_cache")
      .upsert(
        { query_norm: qNorm, recipe_ext_ids: freshIds, expires_at: expIso },
        { onConflict: "query_norm" },
      );
  } catch (e) {
    // AH unreachable / rate-limited: drop the claim so a later search retries.
    console.error("AH fallback failed:", e);
    await admin.from("ah_query_cache").delete().eq("query_norm", qNorm);
  }

  const dbResults = await dbSearch(qNorm);
  const ahRows = await loadAhByIds(freshIds);
  return merge(dbResults, ahRows);
}
