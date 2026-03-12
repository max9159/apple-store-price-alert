import type { LatestRunArtifact, Listing, RunReport, StoreRunReport } from "./types.ts";

function formatListing(listing: Listing): string {
  return `- ${listing.title} | ${listing.priceText} | ${listing.productUrl}`;
}

function pushListingSection(lines: string[], label: string, listings: Listing[]): void {
  lines.push(`${label}:`);

  if (listings.length === 0) {
    lines.push("- None");
    return;
  }

  for (const listing of listings) {
    lines.push(formatListing(listing));
  }
}

function pushOkStoreLines(lines: string[], store: StoreRunReport): void {
  lines.push("Status: OK");
  lines.push(`Current listings: ${store.totalCurrentItems}`);

  if (store.baselineSeeded) {
    lines.push("Baseline seeded for this store on this run.");

    if (store.totalCurrentItems === 0) {
      lines.push("No current Mac Studio listings.");
      return;
    }

    lines.push("Captured items:");
    for (const listing of store.currentItems) {
      lines.push(formatListing(listing));
    }
    return;
  }

  if (store.totalCurrentItems === 0) {
    lines.push("No current Mac Studio listings.");
  }

  pushListingSection(lines, "New items", store.newItems);
  pushListingSection(lines, "Old items", store.oldItems);
}

function pushErrorStoreLines(lines: string[], store: StoreRunReport): void {
  lines.push("Status: ERROR");
  lines.push(`Error: ${store.error ?? "Unknown error"}`);
  lines.push(`Previous snapshot retained: ${store.retainedSnapshotCount}`);

  if (store.currentItems.length > 0) {
    lines.push("Retained items:");
    for (const listing of store.currentItems) {
      lines.push(formatListing(listing));
    }
  }
}

function appendStoreSection(lines: string[], store: StoreRunReport, headingPrefix: string): void {
  lines.push(`${headingPrefix} ${store.store.toUpperCase()} - ${store.storeName}`.trim());
  lines.push(`Source: ${store.sourceUrl}`);

  if (store.status === "ok") {
    pushOkStoreLines(lines, store);
  } else {
    pushErrorStoreLines(lines, store);
  }
}

export function buildMarkdownReport(report: RunReport): string {
  const lines: string[] = [
    "# Apple Refurbished Mac Studio Monitor",
    "",
    `Checked at: ${report.checkedAt}`,
  ];

  if (report.isBaselineSeed) {
    lines.push("Baseline seeded on this run. Telegram notifications were skipped.");
  } else if (report.shouldNotify) {
    lines.push("Telegram notification enabled for this run.");
  } else {
    lines.push("Telegram notification skipped because no prior successful baseline exists.");
  }

  for (const store of report.stores) {
    lines.push("");
    appendStoreSection(lines, store, "##");
  }

  return `${lines.join("\n")}\n`;
}

export function buildTelegramMessage(report: RunReport): string {
  const lines: string[] = [
    "Apple Refurbished Mac Studio Monitor",
    `Checked at: ${report.checkedAt}`,
  ];

  if (report.isBaselineSeed) {
    lines.push("Baseline seeded on this run.");
  }

  for (const store of report.stores) {
    lines.push("");
    appendStoreSection(lines, store, "");
  }

  return lines.join("\n").trim();
}

export function createLatestRunArtifact(report: RunReport): LatestRunArtifact {
  return {
    ...report,
    markdown: buildMarkdownReport(report),
    telegramMessage: buildTelegramMessage(report),
  };
}

