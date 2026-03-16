export const STORE_CODES = ["us", "ca", "tw"] as const;

export type StoreCode = (typeof STORE_CODES)[number];

export interface StoreConfig {
  code: StoreCode;
  name: string;
  url: string;
  acceptLanguage: string;
}

export interface Listing {
  store: StoreCode;
  listingId: string;
  title: string;
  priceText: string;
  productUrl: string;
  checkedAt: string;
}

export interface StoreSnapshot {
  lastSuccessfulCheckAt?: string;
  activeListings: Record<string, Listing>;
}

export interface PersistedState {
  version: 1;
  createdAt: string;
  updatedAt: string;
  stores: Record<StoreCode, StoreSnapshot>;
}

export interface StoreSuccessResult {
  store: StoreCode;
  status: "ok";
  listings: Listing[];
}

export interface StoreErrorResult {
  store: StoreCode;
  status: "error";
  error: string;
}

export type StoreFetchResult = StoreSuccessResult | StoreErrorResult;

export interface StoreRunReport {
  store: StoreCode;
  storeName: string;
  sourceUrl: string;
  status: "ok" | "error";
  checkedAt: string;
  totalCurrentItems: number;
  previousCount: number;
  baselineSeeded: boolean;
  retainedSnapshotCount: number;
  newItems: Listing[];
  oldItems: Listing[];
  currentItems: Listing[];
  error?: string;
}

export interface RunReport {
  checkedAt: string;
  hadPriorSuccessfulRun: boolean;
  hadAnySuccess: boolean;
  isBaselineSeed: boolean;
  hasDataChanged: boolean;
  shouldNotify: boolean;
  stores: StoreRunReport[];
}

export interface LatestRunArtifact extends RunReport {
  markdown: string;
  telegramMessage: string;
}

export interface StatePaths {
  stateDir: string;
  stateFile: string;
  latestJsonFile: string;
  latestMarkdownFile: string;
}

