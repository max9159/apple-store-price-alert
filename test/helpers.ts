import { readFile } from "node:fs/promises";
import type { Listing, PersistedState, StoreCode, StoreFetchResult } from "../src/types.ts";
import { createEmptyState } from "../src/state.ts";

export async function loadFixture(name: string): Promise<string> {
  return readFile(new URL(`./fixtures/${name}`, import.meta.url), "utf8");
}

export function createListing(store: StoreCode, listingId: string, title: string, priceText: string): Listing {
  return {
    store,
    listingId,
    title,
    priceText,
    productUrl: `https://www.apple.com${listingId}`,
    checkedAt: "2026-03-12T06:00:00.000Z",
  };
}

export function createStateWithListings(entries: Partial<Record<StoreCode, Listing[]>>): PersistedState {
  const state = createEmptyState("2026-03-12T05:00:00.000Z");
  state.updatedAt = "2026-03-12T05:00:00.000Z";

  for (const [store, listings] of Object.entries(entries) as [StoreCode, Listing[]][]) {
    state.stores[store] = {
      lastSuccessfulCheckAt: "2026-03-12T05:00:00.000Z",
      activeListings: Object.fromEntries(listings.map((listing) => [listing.listingId, listing])),
    };
  }

  return state;
}

export function createSuccess(store: StoreCode, listings: Listing[]): StoreFetchResult {
  return {
    store,
    status: "ok",
    listings,
  };
}

export function createError(store: StoreCode, error: string): StoreFetchResult {
  return {
    store,
    status: "error",
    error,
  };
}
