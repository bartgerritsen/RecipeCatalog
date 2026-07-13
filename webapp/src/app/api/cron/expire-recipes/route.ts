import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Vercel Cron cleanup: delete AH recipes expired more than 30 days ago, and
 * stale search-miss rows. Guarded by CRON_SECRET; Vercel automatically sends
 * it in the Authorization header for scheduled invocations.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - 30 * 86400_000).toISOString();

  const { count: recipesDeleted } = await admin
    .from("recipes")
    .delete({ count: "exact" })
    .eq("source", "ah")
    .lt("expires_at", cutoff);

  const { count: queryCacheDeleted } = await admin
    .from("ah_query_cache")
    .delete({ count: "exact" })
    .lt("expires_at", new Date().toISOString());

  return NextResponse.json({ recipesDeleted, queryCacheDeleted });
}
