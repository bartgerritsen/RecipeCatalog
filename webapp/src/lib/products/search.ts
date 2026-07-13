import { createAdminClient } from "@/lib/supabase/admin";
import { getAnonToken } from "@/lib/ah/tokens";
import { ahProductSearch, productImageUrl } from "@/lib/ah/products";
import { nextWeekStart } from "@/lib/time";
import type { ProductOption } from "@/lib/cart/suggestions";

/** Cached product search for the "browse alternative" popover. */
export async function searchProductsCached(query: string): Promise<ProductOption[]> {
  const qNorm = query.trim().toLowerCase().replace(/\s+/g, " ");
  if (qNorm.length < 2) return [];

  const admin = createAdminClient();
  const { data: cached } = await admin
    .from("ah_product_search_cache")
    .select("products, expires_at")
    .eq("query_norm", qNorm)
    .maybeSingle();
  if (cached && new Date(cached.expires_at).getTime() > Date.now()) {
    return cached.products as ProductOption[];
  }

  const token = await getAnonToken();
  const found = await ahProductSearch(token, qNorm, 12);
  const products: ProductOption[] = found.map((p) => ({
    productId: p.webshopId,
    title: p.title,
    brand: p.brand ?? null,
    salesUnitSize: p.salesUnitSize ?? null,
    priceFormatted:
      p.priceBeforeBonus != null ? `€ ${p.priceBeforeBonus.toFixed(2).replace(".", ",")}` : null,
    priceAmount: p.priceBeforeBonus ?? null,
    quantity: 1,
    imageUrl: productImageUrl(p),
  }));

  await admin.from("ah_product_search_cache").upsert(
    {
      query_norm: qNorm,
      products,
      expires_at: nextWeekStart(),
    },
    { onConflict: "query_norm" },
  );
  return products;
}
