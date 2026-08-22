import { describe, expect, it, vi } from "vitest";
import { getStockDetail, getStockList } from "./providerData";

describe("provider data adapter", () => {
  it("builds an evaluated US stock detail from Finnhub payloads", async () => {
    const fetcher = vi.fn(async (url: string) => {
      if (url.includes("/quote")) {
        return jsonResponse({ c: 185, d: 2.5, dp: 1.4, h: 187, l: 181, o: 182, pc: 182.5 });
      }

      if (url.includes("/stock/profile2")) {
        return jsonResponse({
          ticker: "GOOGL",
          name: "Alphabet Inc",
          exchange: "NASDAQ",
          currency: "USD",
          finnhubIndustry: "Internet Content & Information",
          marketCapitalization: 2_300_000,
          shareOutstanding: 12_000,
        });
      }

      if (url.includes("/stock/metric")) {
        return jsonResponse({
          metric: {
            peBasicExclExtraTTM: 24,
            psTTM: 7,
            grossMarginTTM: 58,
            operatingMarginTTM: 31,
            roeTTM: 25,
            roicTTM: 19,
            freeCashFlowPerShareTTM: 8,
            revenueGrowthTTMYoy: 14,
          },
        });
      }

      return jsonResponse([
        {
          id: 1,
          headline: "Alphabet wins new cloud contract",
          source: "Mock Wire",
          url: "https://example.com/news",
          datetime: 1_790_000_000,
          summary: "Growth signal",
        },
      ]);
    });

    const detail = await getStockDetail("GOOGL", { FINNHUB_API_KEY: "secret" }, fetcher as unknown as typeof fetch);

    expect(detail).not.toBeNull();
    if (!detail) throw new Error("Expected live detail");
    expect(detail.source).toBe("live");
    expect(detail.input.profile.companyName).toBe("Alphabet Inc");
    expect(detail.input.price.price).toBe(185);
    expect(detail.evaluation.factorScores.map((factor) => factor.name)).toContain("value");
    expect(JSON.stringify(detail)).not.toContain("secret");
  });

  it("returns no stocks when live providers are not configured", async () => {
    const list = await getStockList({}, vi.fn() as unknown as typeof fetch);

    expect(list.source).toBe("live-unavailable");
    expect(list.stocks).toEqual([]);
  });

  it("returns null for an unknown or unavailable symbol", async () => {
    const detail = await getStockDetail("NOPE", {}, vi.fn() as unknown as typeof fetch);

    expect(detail).toBeNull();
  });
});

function jsonResponse(body: unknown) {
  return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
}
