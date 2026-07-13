import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  await admin.from("ah_connections").delete().eq("user_id", userId);
  return NextResponse.json({ ok: true });
}
