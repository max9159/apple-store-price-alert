import { FETCH_TIMEOUT_MS } from "./config.ts";
import { parseAppleRefurbishedPage } from "./parse-apple-refurb-page.ts";
import { toErrorMessage } from "./utils.ts";
import type { StoreConfig, StoreFetchResult } from "./types.ts";

const BROWSER_HEADERS = {
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "cache-control": "no-cache",
  pragma: "no-cache",
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
};

export async function fetchStoreListings(store: StoreConfig, checkedAt: string): Promise<StoreFetchResult> {
  try {
    const response = await fetch(store.url, {
      headers: {
        ...BROWSER_HEADERS,
        "accept-language": store.acceptLanguage,
      },
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`.trim());
    }

    const html = await response.text();
    const listings = parseAppleRefurbishedPage({
      store: store.code,
      sourceUrl: store.url,
      html,
      checkedAt,
    });

    return {
      store: store.code,
      status: "ok",
      listings,
    };
  } catch (error) {
    return {
      store: store.code,
      status: "error",
      error: toErrorMessage(error),
    };
  }
}
