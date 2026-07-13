import { ahRest } from "./client";

export interface AhProduct {
  webshopId: number;
  title: string;
  brand?: string;
  priceBeforeBonus?: number;
  salesUnitSize?: string;
  isBonus?: boolean;
  images?: { url: string; width?: number; height?: number }[];
}

/** Pick a reasonably-sized image url from a REST product's images array. */
export function productImageUrl(p: AhProduct): string | null {
  const imgs = p.images ?? [];
  // Prefer a mid-size (~200-400px wide) image; fall back to the first.
  const mid = imgs.find((i) => (i.width ?? 0) >= 200 && (i.width ?? 0) <= 500);
  return (mid ?? imgs[0])?.url ?? null;
}

export async function ahProductSearch(
  token: string,
  query: string,
  size = 5,
): Promise<AhProduct[]> {
  const data = await ahRest<{ products: AhProduct[] }>(
    token,
    "/mobile-services/product/search/v2",
    { query, sortOn: "RELEVANCE", size },
  );
  return data.products ?? [];
}
