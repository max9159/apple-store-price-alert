import assert from "node:assert/strict";
import test from "node:test";
import { buildRunOutcome } from "../src/monitor-core.ts";
import { createEmptyState } from "../src/state.ts";
import { createError, createListing, createStateWithListings, createSuccess } from "./helpers.ts";

test("first successful run seeds the baseline without notification", () => {
  const previousState = createEmptyState();
  const usListing = createListing("us", "/shop/product/us-one", "Refurbished Mac Studio A", "$1,599.00");
  const caListing = createListing("ca", "/ca/shop/product/ca-one", "Refurbished Mac Studio B", "$2,129.00");

  const { nextState, report } = buildRunOutcome({
    checkedAt: "2026-03-12T06:00:00.000Z",
    previousState,
    fetchResults: [
      createSuccess("us", [usListing]),
      createSuccess("ca", [caListing]),
      createSuccess("tw", []),
    ],
  });

  assert.equal(report.isBaselineSeed, true);
  assert.equal(report.hasDataChanged, true);
  assert.equal(report.shouldNotify, false);
  assert.equal(report.stores[0].newItems.length, 0);
  assert.equal(report.stores[0].oldItems.length, 0);
  assert.deepEqual(Object.keys(nextState.stores.us.activeListings), [usListing.listingId]);
});

test("unchanged listings become old items on later runs with hasDataChanged false", () => {
  const usListing = createListing("us", "/shop/product/us-one", "Refurbished Mac Studio A", "$1,599.00");
  const previousState = createStateWithListings({
    us: [usListing],
    ca: [],
    tw: [],
  });

  const { nextState, report } = buildRunOutcome({
    checkedAt: "2026-03-12T07:00:00.000Z",
    previousState,
    fetchResults: [
      createSuccess("us", [usListing]),
      createSuccess("ca", []),
      createSuccess("tw", []),
    ],
  });

  const usReport = report.stores.find((store) => store.store === "us");
  assert.equal(report.shouldNotify, true);
  assert.equal(report.hasDataChanged, false);
  assert.equal(usReport?.newItems.length, 0);
  assert.equal(usReport?.oldItems.length, 1);
  assert.equal(nextState, previousState);
});

test("newly added listings are classified as new while existing ones stay old", () => {
  const existing = createListing("us", "/shop/product/us-one", "Refurbished Mac Studio A", "$1,599.00");
  const added = createListing("us", "/shop/product/us-two", "Refurbished Mac Studio B", "$2,219.00");
  const previousState = createStateWithListings({
    us: [existing],
    ca: [],
    tw: [],
  });

  const { report } = buildRunOutcome({
    checkedAt: "2026-03-12T07:00:00.000Z",
    previousState,
    fetchResults: [
      createSuccess("us", [existing, added]),
      createSuccess("ca", []),
      createSuccess("tw", []),
    ],
  });

  const usReport = report.stores.find((store) => store.store === "us");
  assert.equal(report.hasDataChanged, true);
  assert.deepEqual(usReport?.newItems.map((item) => item.listingId), [added.listingId]);
  assert.deepEqual(usReport?.oldItems.map((item) => item.listingId), [existing.listingId]);
});

test("a disappeared listing is treated as new if it returns later", () => {
  const listing = createListing("us", "/shop/product/us-one", "Refurbished Mac Studio A", "$1,599.00");
  const previousState = createStateWithListings({
    us: [listing],
    ca: [],
    tw: [],
  });

  const removalRun = buildRunOutcome({
    checkedAt: "2026-03-12T07:00:00.000Z",
    previousState,
    fetchResults: [
      createSuccess("us", []),
      createSuccess("ca", []),
      createSuccess("tw", []),
    ],
  });

  assert.equal(removalRun.report.hasDataChanged, true);
  assert.equal(Object.keys(removalRun.nextState.stores.us.activeListings).length, 0);

  const returnRun = buildRunOutcome({
    checkedAt: "2026-03-12T08:00:00.000Z",
    previousState: removalRun.nextState,
    fetchResults: [
      createSuccess("us", [listing]),
      createSuccess("ca", []),
      createSuccess("tw", []),
    ],
  });

  assert.equal(returnRun.report.hasDataChanged, true);
  const usReport = returnRun.report.stores.find((store) => store.store === "us");
  assert.deepEqual(usReport?.newItems.map((item) => item.listingId), [listing.listingId]);
  assert.equal(usReport?.oldItems.length, 0);
});

test("store failures retain the previous snapshot instead of clearing it", () => {
  const listing = createListing("us", "/shop/product/us-one", "Refurbished Mac Studio A", "$1,599.00");
  const previousState = createStateWithListings({
    us: [listing],
    ca: [],
    tw: [],
  });

  const { nextState, report } = buildRunOutcome({
    checkedAt: "2026-03-12T07:00:00.000Z",
    previousState,
    fetchResults: [
      createError("us", "HTTP 500 Internal Server Error"),
      createSuccess("ca", []),
      createSuccess("tw", []),
    ],
  });

  const usReport = report.stores.find((store) => store.store === "us");
  assert.equal(report.hasDataChanged, false);
  assert.equal(usReport?.status, "error");
  assert.equal(usReport?.retainedSnapshotCount, 1);
  assert.deepEqual(Object.keys(nextState.stores.us.activeListings), [listing.listingId]);
});

test("no data change keeps nextState as previousState reference", () => {
  const usListing = createListing("us", "/shop/product/us-one", "Refurbished Mac Studio A", "$1,599.00");
  const caListing = createListing("ca", "/ca/shop/product/ca-one", "Refurbished Mac Studio B", "$2,129.00");
  const previousState = createStateWithListings({
    us: [usListing],
    ca: [caListing],
    tw: [],
  });

  const { nextState, report } = buildRunOutcome({
    checkedAt: "2026-03-12T07:00:00.000Z",
    previousState,
    fetchResults: [
      createSuccess("us", [usListing]),
      createSuccess("ca", [caListing]),
      createSuccess("tw", []),
    ],
  });

  assert.equal(report.hasDataChanged, false);
  assert.equal(report.shouldNotify, true);
  assert.equal(nextState, previousState);
  assert.equal(nextState.updatedAt, previousState.updatedAt);
});

