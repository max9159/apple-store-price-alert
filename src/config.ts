import type { StoreConfig } from "./types.ts";

export const STORES: StoreConfig[] = [
  {
    code: "us",
    name: "United States",
    url: "https://www.apple.com/shop/refurbished/mac/mac-studio",
    acceptLanguage: "en-US,en;q=0.9",
  },
  {
    code: "ca",
    name: "Canada",
    url: "https://www.apple.com/ca/shop/refurbished/mac/mac-studio",
    acceptLanguage: "en-CA,en;q=0.9",
  },
  {
    code: "tw",
    name: "Taiwan",
    url: "https://www.apple.com/tw/shop/refurbished/mac/mac-studio",
    acceptLanguage: "zh-TW,zh;q=0.9,en;q=0.8",
  },
];

export const APPLE_BOOTSTRAP_ASSIGNMENT = "window.REFURB_GRID_BOOTSTRAP = ";
export const MATCH_TERM = "mac studio";
export const FETCH_TIMEOUT_MS = 20_000;

