import assert from "node:assert/strict";
import test from "node:test";
import { parseAppleRefurbishedPage } from "../src/parse-apple-refurb-page.ts";
import { loadFixture } from "./helpers.ts";

test("parses US fixture and keeps only Mac Studio listings", async () => {
  const html = await loadFixture("us.html");
  const listings = parseAppleRefurbishedPage({
    store: "us",
    sourceUrl: "https://www.apple.com/shop/refurbished/mac/mac-studio",
    html,
    checkedAt: "2026-03-12T06:00:00.000Z",
  });

  assert.equal(listings.length, 2);
  assert.equal(listings[0].store, "us");
  assert.match(listings[0].title, /Mac Studio/);
  assert.match(listings[0].priceText, /\$/);
  assert.equal(listings[0].listingId.startsWith("/shop/product/"), true);
  assert.equal(listings[0].productUrl.includes("?"), false);
});

test("parses Canada fixture and keeps store-scoped product paths", async () => {
  const html = await loadFixture("ca.html");
  const listings = parseAppleRefurbishedPage({
    store: "ca",
    sourceUrl: "https://www.apple.com/ca/shop/refurbished/mac/mac-studio",
    html,
    checkedAt: "2026-03-12T06:00:00.000Z",
  });

  assert.equal(listings.length, 2);
  assert.equal(listings[0].listingId.startsWith("/ca/shop/product/"), true);
  assert.equal(listings.every((listing) => listing.title.includes("Mac Studio")), true);
});

test("parses Taiwan fixture and matches titles containing non-breaking spaces", async () => {
  const html = await loadFixture("tw.html");
  const listings = parseAppleRefurbishedPage({
    store: "tw",
    sourceUrl: "https://www.apple.com/tw/shop/refurbished/mac/mac-studio",
    html,
    checkedAt: "2026-03-12T06:00:00.000Z",
  });

  assert.equal(listings.length, 2);
  assert.equal(listings.every((listing) => listing.title.includes("Mac Studio")), true);
  assert.equal(listings.every((listing) => listing.priceText.startsWith("NT$")), true);
});

