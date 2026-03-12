import type { LatestRunArtifact, Listing, RunReport, StoreRunReport } from "./types.ts";

function formatListing(listing: Listing): string {
  return `- ${listing.title} | ${listing.priceText} | ${listing.productUrl}`;
}

function escapeTelegramHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

function formatCheckedAtForTelegram(checkedAt: string): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = new Map(
    formatter
      .formatToParts(new Date(checkedAt))
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${parts.get("year")}-${parts.get("month")}-${parts.get("day")} ${parts.get("hour")}:${parts.get("minute")} Taipei`;
}

function formatTelegramLink(label: string, url: string): string {
  return `<a href="${escapeTelegramHtml(url)}">${escapeTelegramHtml(label)}</a>`;
}

function pushTelegramListingSection(lines: string[], label: string, listings: Listing[]): void {
  if (listings.length === 0) {
    lines.push(`<b>${escapeTelegramHtml(label)}</b>: none`);
    return;
  }

  lines.push(`<b>${escapeTelegramHtml(label)}</b>`);

  for (const [index, listing] of listings.entries()) {
    lines.push(
      `${index + 1}. ${escapeTelegramHtml(listing.priceText)}`,
      escapeTelegramHtml(listing.title),
      formatTelegramLink("Open listing", listing.productUrl),
      "",
    );
  }

  if (lines.at(-1) === "") {
    lines.pop();
  }
}

function appendTelegramStoreSection(lines: string[], store: StoreRunReport): void {
  lines.push(`<b>${store.store.toUpperCase()} - ${escapeTelegramHtml(store.storeName)}</b>`);

  if (store.status === "error") {
    lines.push(`Error: ${escapeTelegramHtml(store.error ?? "Unknown error")}`);
    lines.push(`Retained snapshot: ${store.retainedSnapshotCount} item(s)`);
    lines.push(formatTelegramLink("Open store page", store.sourceUrl));
    return;
  }

  if (store.baselineSeeded) {
    lines.push(`${store.totalCurrentItems} listed`);

    if (store.totalCurrentItems === 0) {
      lines.push("Baseline seeded. No Mac Studio listings right now.");
      lines.push(formatTelegramLink("Open store page", store.sourceUrl));
      return;
    }

    lines.push("Baseline seeded.");
    pushTelegramListingSection(lines, "Captured items", store.currentItems);
    return;
  }

  lines.push(`${store.totalCurrentItems} listed · ${store.newItems.length} new · ${store.oldItems.length} old`);

  if (store.totalCurrentItems === 0) {
    lines.push("No Mac Studio listings right now.");
    lines.push(formatTelegramLink("Open store page", store.sourceUrl));
    return;
  }

  pushTelegramListingSection(lines, "New", store.newItems);
  lines.push("");
  pushTelegramListingSection(lines, "Old", store.oldItems);
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
    "<b>Apple Refurbished Mac Studio Monitor</b>",
    `Checked: ${formatCheckedAtForTelegram(report.checkedAt)}`,
  ];

  if (report.isBaselineSeed) {
    lines.push("Baseline seeded on this run.");
  }

  for (const store of report.stores) {
    lines.push("");
    appendTelegramStoreSection(lines, store);
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

