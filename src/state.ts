import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { STORE_CODES } from "./types.ts";
import type { LatestRunArtifact, Listing, PersistedState, StatePaths, StoreCode, StoreSnapshot } from "./types.ts";

function createEmptySnapshot(): StoreSnapshot {
  return {
    activeListings: {},
  };
}

function cloneListingRecord(activeListings: Record<string, Listing>): Record<string, Listing> {
  const nextListings: Record<string, Listing> = {};

  for (const listing of Object.values(activeListings)) {
    nextListings[listing.listingId] = { ...listing };
  }

  return nextListings;
}

function normalizeStoreSnapshot(snapshot: Partial<StoreSnapshot> | undefined): StoreSnapshot {
  return {
    lastSuccessfulCheckAt: snapshot?.lastSuccessfulCheckAt,
    activeListings: cloneListingRecord(snapshot?.activeListings ?? {}),
  };
}

function buildEmptyStores(): Record<StoreCode, StoreSnapshot> {
  return {
    us: createEmptySnapshot(),
    ca: createEmptySnapshot(),
    tw: createEmptySnapshot(),
  };
}

export function getStatePaths(rootDir = process.cwd()): StatePaths {
  const stateDir = path.join(rootDir, "state");

  return {
    stateDir,
    stateFile: path.join(stateDir, "monitor-state.json"),
    latestJsonFile: path.join(stateDir, "latest.json"),
    latestMarkdownFile: path.join(stateDir, "latest.md"),
  };
}

export function createEmptyState(timestamp = ""): PersistedState {
  return {
    version: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
    stores: buildEmptyStores(),
  };
}

export function normalizePersistedState(value: Partial<PersistedState> | undefined): PersistedState {
  const baseState = createEmptyState();

  for (const code of STORE_CODES) {
    baseState.stores[code] = normalizeStoreSnapshot(value?.stores?.[code]);
  }

  baseState.createdAt = value?.createdAt ?? "";
  baseState.updatedAt = value?.updatedAt ?? "";

  return baseState;
}

export async function readPersistedState(stateFile: string): Promise<PersistedState> {
  try {
    const contents = await readFile(stateFile, "utf8");
    return normalizePersistedState(JSON.parse(contents) as PersistedState);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return createEmptyState();
    }

    throw error;
  }
}

export async function readLatestRunArtifact(latestJsonFile: string): Promise<LatestRunArtifact> {
  const contents = await readFile(latestJsonFile, "utf8");
  return JSON.parse(contents) as LatestRunArtifact;
}

async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function writeMonitorArtifacts(options: {
  paths: StatePaths;
  state: PersistedState;
  latestArtifact: LatestRunArtifact;
  writeState?: boolean;
}): Promise<void> {
  await mkdir(options.paths.stateDir, { recursive: true });

  if (options.writeState !== false) {
    await writeJsonFile(options.paths.stateFile, options.state);
  }

  await writeJsonFile(options.paths.latestJsonFile, options.latestArtifact);
  await writeFile(options.paths.latestMarkdownFile, options.latestArtifact.markdown, "utf8");
}

