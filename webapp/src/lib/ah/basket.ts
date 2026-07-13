import { ahGraphQL } from "./client";

const BASKET_QUERY = `
query GetBasket {
  basket {
    summary {
      quantity
      price {
        totalPrice { amount formatted }
        discount { amount formatted }
      }
    }
    products {
      id quantity
      product {
        id title brand
        price { now { amount formatted } }
      }
    }
  }
}`;

const ADD_TO_BASKET = `
mutation AddToBasket($items: [BasketMutation!]!) {
  basketItemsAdd(items: $items) { status errorMessage }
}`;

const DELETE_FROM_BASKET = `
mutation DeleteFromBasket($items: [BasketDelete!]!) {
  basketItemsDelete(items: $items) { status errorMessage }
}`;

const UPDATE_BASKET = `
mutation UpdateBasket($items: [BasketMutation!]!) {
  basketItemsUpdate(items: $items) { status errorMessage }
}`;

export interface BasketItem {
  productId: number;
  quantity: number;
  title: string;
  brand: string | null;
  priceFormatted: string | null;
}

export interface Basket {
  quantity: number;
  totalFormatted: string | null;
  items: BasketItem[];
}

export async function ahGetBasket(token: string): Promise<Basket> {
  const data = await ahGraphQL<{
    basket: {
      summary: { quantity: number; price: { totalPrice: { formatted: string } } };
      products: {
        id: number;
        quantity: number;
        product: {
          title: string;
          brand: string | null;
          price: { now: { formatted: string } | null } | null;
        };
      }[];
    };
  }>(token, BASKET_QUERY);

  const b = data.basket;
  return {
    quantity: b.summary?.quantity ?? 0,
    totalFormatted: b.summary?.price?.totalPrice?.formatted ?? null,
    items: (b.products ?? []).map((p) => ({
      productId: p.id,
      quantity: p.quantity,
      title: p.product.title,
      brand: p.product.brand,
      priceFormatted: p.product.price?.now?.formatted ?? null,
    })),
  };
}

export async function ahAddToBasket(
  token: string,
  items: { id: number; quantity: number }[],
): Promise<{ status: string; errorMessage: string | null }> {
  const data = await ahGraphQL<{
    basketItemsAdd: { status: string; errorMessage: string | null };
  }>(token, ADD_TO_BASKET, { items });
  return data.basketItemsAdd;
}

export async function ahDeleteFromBasket(
  token: string,
  ids: number[],
): Promise<{ status: string; errorMessage: string | null }> {
  const data = await ahGraphQL<{
    basketItemsDelete: { status: string; errorMessage: string | null };
  }>(token, DELETE_FROM_BASKET, { items: ids.map((id) => ({ id })) });
  return data.basketItemsDelete;
}

export async function ahUpdateBasket(
  token: string,
  items: { id: number; quantity: number }[],
): Promise<{ status: string; errorMessage: string | null }> {
  const data = await ahGraphQL<{
    basketItemsUpdate: { status: string; errorMessage: string | null };
  }>(token, UPDATE_BASKET, { items });
  return data.basketItemsUpdate;
}
