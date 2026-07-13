import { redirect } from "next/navigation";
import ProfileClient from "./ProfileClient";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/profile");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: favorites } = await supabase
    .from("user_favorite_products")
    .select("ingredient_norm, product_title, webshop_id")
    .eq("user_id", user.id);

  return (
    <ProfileClient
      email={user.email ?? ""}
      profile={profile ?? null}
      favorites={favorites ?? []}
    />
  );
}
