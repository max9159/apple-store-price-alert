import assert from "node:assert/strict";
import test from "node:test";
import { buildMarkdownReport, buildTelegramMessage } from "../src/report.ts";
import { createListing } from "./helpers.ts";

test("report builders include new items, old items, empty stores, and store errors", () => {
  const newItem = createListing("us", "/shop/product/us-new", "Refurbished Mac Studio New", "$2,219.00");
  const oldItem = createListing("us", "/shop/product/us-old", "Refurbished Mac Studio Old", "$1,599.00");
  const retained = createListing("tw", "/tw/shop/product/tw-one", "Mac Studio Apple M2 Ultra", "NT$105,490");

  const report = {
    checkedAt: "2026-03-12T07:00:00.000Z",
    hadPriorSuccessfulRun: true,
    hadAnySuccess: true,
    isBaselineSeed: false,
    shouldNotify: true,
    stores: [
      {
        store: "us",
        storeName: "United States",
        sourceUrl: "https://www.apple.com/shop/refurbished/mac/mac-studio",
        status: "ok" as const,
        checkedAt: "2026-03-12T07:00:00.000Z",
        totalCurrentItems: 2,
        previousCount: 1,
        baselineSeeded: false,
        retainedSnapshotCount: 0,
        newItems: [newItem],
        oldItems: [oldItem],
        currentItems: [newItem, oldItem],
      },
      {
        store: "ca",
        storeName: "Canada",
        sourceUrl: "https://www.apple.com/ca/shop/refurbished/mac/mac-studio",
        status: "ok" as const,
        checkedAt: "2026-03-12T07:00:00.000Z",
        totalCurrentItems: 0,
        previousCount: 0,
        baselineSeeded: false,
        retainedSnapshotCount: 0,
        newItems: [],
        oldItems: [],
        currentItems: [],
      },
      {
        store: "tw",
        storeName: "Taiwan",
        sourceUrl: "https://www.apple.com/tw/shop/refurbished/mac/mac-studio",
        status: "error" as const,
        checkedAt: "2026-03-12T07:00:00.000Z",
        totalCurrentItems: 1,
        previousCount: 1,
        baselineSeeded: false,
        retainedSnapshotCount: 1,
        newItems: [],
        oldItems: [],
        currentItems: [retained],
        error: "HTTP 500 Internal Server Error",
      },
    ],
  };

  const markdown = buildMarkdownReport(report);
  const telegram = buildTelegramMessage(report);

  assert.match(markdown, /New items:/);
  assert.match(markdown, /Old items:/);
  assert.match(markdown, /No current Mac Studio listings\./);
  assert.match(markdown, /Previous snapshot retained: 1/);

  assert.match(telegram, /<b>Apple Refurbished Mac Studio Monitor<\/b>/);
  assert.match(telegram, /Checked: 2026-03-12 15:00 Taipei/);
  assert.match(telegram, /<b>US - United States<\/b>/);
  assert.match(telegram, /2 listed · 1 new · 1 old/);
  assert.match(telegram, /<a href="https:\/\/www\.apple\.com\/shop\/product\/us-new">Open listing<\/a>/);
  assert.match(telegram, /<b>New<\/b>/);
  assert.match(telegram, /<b>Old<\/b>/);
  assert.match(telegram, /No Mac Studio listings right now\./);
  assert.match(telegram, /Error: HTTP 500 Internal Server Error/);
  assert.match(telegram, /Open store page/);
});

