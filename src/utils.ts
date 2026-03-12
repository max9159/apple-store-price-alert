import type { Listing } from "./types.ts";

const HTML_ENTITY_MAP: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: "\"",
};

export function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, code) => {
    const normalizedCode = String(code).toLowerCase();

    if (normalizedCode.startsWith("#x")) {
      return String.fromCodePoint(Number.parseInt(normalizedCode.slice(2), 16));
    }

    if (normalizedCode.startsWith("#")) {
      return String.fromCodePoint(Number.parseInt(normalizedCode.slice(1), 10));
    }

    return HTML_ENTITY_MAP[normalizedCode] ?? entity;
  });
}

export function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, " ");
}

export function normalizeWhitespace(value: string): string {
  return value.replace(/[\u00a0\u2007\u202f]/g, " ").replace(/\s+/g, " ").trim();
}

export function normalizeText(value: string): string {
  return normalizeWhitespace(decodeHtmlEntities(stripHtml(value)));
}

export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export function sortListings(listings: Listing[]): Listing[] {
  return [...listings].sort((left, right) => {
    const byTitle = left.title.localeCompare(right.title);
    if (byTitle !== 0) {
      return byTitle;
    }

    const byPrice = left.priceText.localeCompare(right.priceText);
    if (byPrice !== 0) {
      return byPrice;
    }

    return left.listingId.localeCompare(right.listingId);
  });
}

