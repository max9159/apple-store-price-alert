import { appendFile } from "node:fs/promises";
import { STORES } from "./config.ts";
import { fetchStoreListings } from "./fetch-store.ts";
import { buildRunOutcome } from "./monitor-core.ts";
import { createLatestRunArtifact } from "./report.ts";
import { getStatePaths, readPersistedState, writeMonitorArtifacts } from "./state.ts";

async function writeGitHubOutputs(outputs: Record<string, string>): Promise<void> {
  const githubOutputPath = process.env.GITHUB_OUTPUT;
  if (!githubOutputPath) {
    return;
  }

  const lines = Object.entries(outputs).map(([key, value]) => `${key}=${value}`);
  await appendFile(githubOutputPath, `${lines.join("\n")}\n`, "utf8");
}

async function main(): Promise<void> {
  const checkedAt = new Date().toISOString();
  const paths = getStatePaths();
  const previousState = await readPersistedState(paths.stateFile);
  const fetchResults = await Promise.all(STORES.map((store) => fetchStoreListings(store, checkedAt)));
  const { nextState, report } = buildRunOutcome({
    checkedAt,
    previousState,
    fetchResults,
  });
  const latestArtifact = createLatestRunArtifact(report);

  await writeMonitorArtifacts({
    paths,
    state: nextState,
    latestArtifact,
    writeState: report.hasDataChanged,
  });

  await writeGitHubOutputs({
    checked_at: report.checkedAt,
    had_any_success: String(report.hadAnySuccess),
    is_baseline_seed: String(report.isBaselineSeed),
    should_notify: String(report.shouldNotify),
  });

  process.stdout.write(latestArtifact.markdown);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});

