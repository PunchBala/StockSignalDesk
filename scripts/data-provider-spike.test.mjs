import { describe, expect, it } from "vitest";
import { buildSpikePlan, parseArgs, parseEnvText, runSpike, summarizeJsonPayload } from "./data-provider-spike.mjs";

describe("data provider spike", () => {
  it("uses the agreed V1 watchlist when no symbols are provided", () => {
    expect(parseArgs([]).symbols).toEqual(["GOOGL", "MU", "APP", "RKLB", "RR.L"]);
  });

  it("marks provider checks as skipped when API keys are missing", async () => {
    const report = await runSpike({ env: {}, dryRun: false, fetcher: unreachableFetch });

    expect(report.results.every((result) => result.status === "skipped")).toBe(true);
    expect(report.results.some((result) => result.reason === "missing FMP_API_KEY")).toBe(true);
    expect(report.results.some((result) => result.reason === "missing FINNHUB_API_KEY")).toBe(true);
  });

  it("plans checks without calling providers in dry-run mode", async () => {
    const report = await runSpike({
      env: { FMP_API_KEY: "test", FINNHUB_API_KEY: "test" },
      dryRun: true,
      fetcher: unreachableFetch,
    });

    expect(report.results.every((result) => result.status === "planned")).toBe(true);
  });

  it("summarizes provider payload shape without storing full responses", () => {
    expect(summarizeJsonPayload([{ symbol: "RKLB", price: 70.2, volume: 1000 }])).toEqual({
      hasData: true,
      rowCount: 1,
      sampleKeys: ["symbol", "price", "volume"],
    });
  });

  it("parses local env text without leaking it into output", () => {
    expect(parseEnvText("FMP_API_KEY=abc123\n# comment\nFINNHUB_API_KEY=\"xyz789\"")).toEqual({
      FMP_API_KEY: "abc123",
      FINNHUB_API_KEY: "xyz789",
    });
  });

  it("exposes configured state per provider", () => {
    const plan = buildSpikePlan({ FMP_API_KEY: "test" }, ["GOOGL"]);

    expect(plan.find((provider) => provider.provider === "fmp")?.configured).toBe(true);
    expect(plan.find((provider) => provider.provider === "finnhub")?.configured).toBe(false);
  });
});

function unreachableFetch() {
  throw new Error("fetch should not be called in this test");
}
