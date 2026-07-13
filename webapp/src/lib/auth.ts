import { createClient } from "@/lib/supabase/server";

/** Current logged-in user id, or null. For use in Route Handlers / Server Components. */
export async function getUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}
