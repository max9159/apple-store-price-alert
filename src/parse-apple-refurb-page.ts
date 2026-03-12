import { APPLE_BOOTSTRAP_ASSIGNMENT, MATCH_TERM } from "./config.ts";
import { normalizeText, normalizeWhitespace, sortListings } from "./utils.ts";
import type { Listing, StoreCode } from "./types.ts";

interface BootstrapPayload {
  tiles?: BootstrapTile[];
}

interface BootstrapTile {
  title?: string;
  productDetailsUrl?: string;
  price?: {
    priceCurrency?: string;
    currentPrice?: {
      amount?: string;
      raw_amount?: string;
    };
  };
}

interface ParsePageOptions {
  store: StoreCode;
  sourceUrl: string;
  html: string;
  checkedAt: string;
}

export function extractBootstrapJson(source: string): string {
  const assignmentIndex = source.indexOf(APPLE_BOOTSTRAP_ASSIGNMENT);
  if (assignmentIndex === -1) {
    throw new Error("Could not find Apple refurb bootstrap payload.");
  }

  const objectStart = source.indexOf("{", assignmentIndex + APPLE_BOOTSTRAP_ASSIGNMENT.length);
  if (objectStart === -1) {
    throw new Error("Could not locate bootstrap JSON object.");
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = objectStart; index < source.length; index += 1) {
    const character = source[index];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (character === "\\") {
        escaped = true;
        continue;
      }

      if (character === "\"") {
        inString = false;
      }

      continue;
    }

    if (character === "\"") {
      inString = true;
      continue;
    }

    if (character === "{") {
      depth += 1;
      continue;
    }

    if (character === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(objectStart, index + 1);
      }
    }
  }

  throw new Error("Bootstrap JSON object was not terminated.");
}

function normalizePrice(tile: BootstrapTile): string {
  const amount = normalizeText(tile.price?.currentPrice?.amount ?? "");
  if (amount) {
    return amount;
  }

  const rawAmount = normalizeWhitespace(tile.price?.currentPrice?.raw_amount ?? "");
  const currency = normalizeWhitespace(tile.price?.priceCurrency ?? "");

  if (!rawAmount) {
    return "Unavailable";
  }

  return currency ? `${currency} ${rawAmount}` : rawAmount;
}

function normalizeProduct(sourceUrl: string, rawUrl: string): { listingId: string; productUrl: string } {
  if (!rawUrl) {
    throw new Error("Listing is missing productDetailsUrl.");
  }

  const normalizedUrl = new URL(rawUrl, sourceUrl);
  normalizedUrl.search = "";
  normalizedUrl.hash = "";

  return {
    listingId: normalizedUrl.pathname.replace(/\/+$/, ""),
    productUrl: normalizedUrl.toString(),
  };
}

export function parseAppleRefurbishedPage(options: ParsePageOptions): Listing[] {
  const bootstrap = JSON.parse(extractBootstrapJson(options.html)) as BootstrapPayload;

  if (!Array.isArray(bootstrap.tiles)) {
    throw new Error("Apple refurb bootstrap payload does not contain tiles.");
  }

  const listingsById = new Map<string, Listing>();

  for (const tile of bootstrap.tiles) {
    const title = normalizeWhitespace(tile.title ?? "");
    if (!title || !title.toLowerCase().includes(MATCH_TERM)) {
      continue;
    }

    const product = normalizeProduct(options.sourceUrl, tile.productDetailsUrl ?? "");
    const listing: Listing = {
      store: options.store,
      listingId: product.listingId,
      title,
      priceText: normalizePrice(tile),
      productUrl: product.productUrl,
      checkedAt: options.checkedAt,
    };

    listingsById.set(listing.listingId, listing);
  }

  return sortListings([...listingsById.values()]);
}

