import { STORES } from "./config.ts";
import { sortListings } from "./utils.ts";
import type {
  Listing,
  PersistedState,
  RunReport,
  StoreFetchResult,
  StoreRunReport,
  StoreSnapshot,
} from "./types.ts";

interface BuildRunOutcomeInput {
  checkedAt: string;
  previousState: PersistedState;
  fetchResults: StoreFetchResult[];
}

interface BuildRunOutcomeResult {
  nextState: PersistedState;
  report: RunReport;
}

function cloneActiveListings(activeListings: Record<string, Listing>): Record<string, Listing> {
  const nextListings: Record<string, Listing> = {};

  for (const listing of Object.values(activeListings)) {
    nextListings[listing.listingId] = { ...listing };
  }

  return nextListings;
}

function cloneSnapshot(snapshot: StoreSnapshot): StoreSnapshot {
  return {
    lastSuccessfulCheckAt: snapshot.lastSuccessfulCheckAt,
    activeListings: cloneActiveListings(snapshot.activeListings),
  };
}

function hasPriorSuccessfulRun(previousState: PersistedState): boolean {
  return Object.values(previousState.stores).some((snapshot) => Boolean(snapshot.lastSuccessfulCheckAt));
}

function toListingRecord(listings: Listing[]): Record<string, Listing> {
  const byId: Record<string, Listing> = {};

  for (const listing of sortListings(listings)) {
    byId[listing.listingId] = listing;
  }

  return byId;
}

export function buildRunOutcome(input: BuildRunOutcomeInput): BuildRunOutcomeResult {
  const hadPriorSuccessfulRun = hasPriorSuccessfulRun(input.previousState);
  const hadAnySuccess = input.fetchResults.some((result) => result.status === "ok");
  const isBaselineSeed = !hadPriorSuccessfulRun && hadAnySuccess;
  const fetchResultsByStore = new Map(input.fetchResults.map((result) => [result.store, result]));

  const nextState: PersistedState = {
    version: 1,
    createdAt: input.previousState.createdAt || input.checkedAt,
    updatedAt: input.checkedAt,
    stores: {
      us: cloneSnapshot(input.previousState.stores.us),
      ca: cloneSnapshot(input.previousState.stores.ca),
      tw: cloneSnapshot(input.previousState.stores.tw),
    },
  };

  const stores: StoreRunReport[] = [];

  for (const store of STORES) {
    const fetchResult = fetchResultsByStore.get(store.code);
    const previousSnapshot = input.previousState.stores[store.code];

    if (!fetchResult) {
      stores.push({
        store: store.code,
        storeName: store.name,
        sourceUrl: store.url,
        status: "error",
        checkedAt: input.checkedAt,
        totalCurrentItems: Object.keys(previousSnapshot.activeListings).length,
        previousCount: Object.keys(previousSnapshot.activeListings).length,
        baselineSeeded: false,
        retainedSnapshotCount: Object.keys(previousSnapshot.activeListings).length,
        newItems: [],
        oldItems: [],
        currentItems: sortListings(Object.values(previousSnapshot.activeListings)),
        error: "Store was not fetched.",
      });
      continue;
    }

    if (fetchResult.status === "error") {
      stores.push({
        store: store.code,
        storeName: store.name,
        sourceUrl: store.url,
        status: "error",
        checkedAt: input.checkedAt,
        totalCurrentItems: Object.keys(previousSnapshot.activeListings).length,
        previousCount: Object.keys(previousSnapshot.activeListings).length,
        baselineSeeded: false,
        retainedSnapshotCount: Object.keys(previousSnapshot.activeListings).length,
        newItems: [],
        oldItems: [],
        currentItems: sortListings(Object.values(previousSnapshot.activeListings)),
        error: fetchResult.error,
      });
      continue;
    }

    const currentItems = sortListings(fetchResult.listings);
    const previousListings = previousSnapshot.activeListings;
    const previousIds = new Set(Object.keys(previousListings));
    const newItems = isBaselineSeed
      ? []
      : currentItems.filter((listing) => !previousIds.has(listing.listingId));
    const oldItems = isBaselineSeed
      ? []
      : currentItems.filter((listing) => previousIds.has(listing.listingId));

    nextState.stores[store.code] = {
      lastSuccessfulCheckAt: input.checkedAt,
      activeListings: toListingRecord(currentItems),
    };

    stores.push({
      store: store.code,
      storeName: store.name,
      sourceUrl: store.url,
      status: "ok",
      checkedAt: input.checkedAt,
      totalCurrentItems: currentItems.length,
      previousCount: Object.keys(previousSnapshot.activeListings).length,
      baselineSeeded: isBaselineSeed,
      retainedSnapshotCount: 0,
      newItems,
      oldItems,
      currentItems,
    });
  }

  return {
    nextState,
    report: {
      checkedAt: input.checkedAt,
      hadPriorSuccessfulRun,
      hadAnySuccess,
      isBaselineSeed,
      shouldNotify: hadPriorSuccessfulRun,
      stores,
    },
  };
}

