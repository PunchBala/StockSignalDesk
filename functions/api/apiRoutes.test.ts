import { afterEach, describe, expect, it, vi } from "vitest";
import { onRequestGet } from "./[[path]]";

describe("API routes", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns provider health without exposing secrets", async () => {
    const response = await callRoute("/api/health", {
      FMP_API_KEY: "secret",
      FINNHUB_API_KEY: "secret",
      ALPHA_VANTAGE_API_KEY: "secret",
    });
    const body = (await response.json()) as HealthResponse;

    expect(response.status).toBe(200);
    expect(body.providersConfigured).toEqual({
      fmp: true,
      finnhub: true,
      alphaVantage: true,
      database: false,
    });
    expect(JSON.stringify(body)).not.toContain("secret");
  });

  it("requires live providers for stock lists", async () => {
    const response = await callRoute("/api/stocks");
    const body = (await response.json()) as ApiErrorResponse;

    expect(response.status).toBe(503);
    expect(body.error).toBe("Live providers are not configured");
  });

  it("returns evaluated live stocks", async () => {
    stubFinnhubFetch();

    const response = await callRoute("/api/stocks", { FINNHUB_API_KEY: "secret" });
    const body = (await response.json()) as StocksListResponse;

    expect(response.status).toBe(200);
    expect(body.meta).toEqual({ count: 3, source: "live" });
    expect(body.data.map((stock: { symbol: string }) => stock.symbol)).toContain("GOOGL");
    expect(body.data.every((stock: { status: string; score: number }) => stock.status && stock.score >= 0)).toBe(true);
    expect(JSON.stringify(body)).not.toContain("secret");
  });

  it("returns a full live stock detail payload", async () => {
    stubFinnhubFetch();

    const response = await callRoute("/api/stocks/GOOGL", { FINNHUB_API_KEY: "secret" });
    const body = (await response.json()) as StockDetailResponse;

    expect(response.status).toBe(200);
    expect(body.data.profile.symbol).toBe("GOOGL");
    expect(body.meta.source).toBe("live");
    expect(body.data.evaluation.status).toBeTruthy();
  });

  it("returns 404 for unavailable live symbols", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ error: "not available" }, 403)));

    const response = await callRoute("/api/stocks/NOPE", { FINNHUB_API_KEY: "secret" });
    const body = (await response.json()) as ApiErrorResponse;

    expect(response.status).toBe(404);
    expect(body.error).toBe("Live stock data unavailable");
  });
});

function callRoute(path: string, env: Record<string, string | undefined> = {}) {
  return onRequestGet({
    request: new Request(`https://example.com${path}`),
    env,
    params: {},
    waitUntil: () => undefined,
    next: () => Promise.resolve(new Response()),
    data: {},
    functionPath: "/api/[[path]]",
    passThroughOnException: () => undefined,
  } as unknown as EventContext<Record<string, string | undefined>, string, Record<string, unknown>>);
}

interface HealthResponse {
  providersConfigured: {
    fmp: boolean;
    finnhub: boolean;
    alphaVantage: boolean;
    database: boolean;
  };
}

interface StocksListResponse {
  data: Array<{
    symbol: string;
    status: string;
    score: number;
  }>;
  meta: {
    count: number;
    source: string;
  };
}

interface StockDetailResponse {
  data: {
    profile: {
      symbol: string;
    };
    evaluation: {
      status: string;
      riskFlags: string[];
    };
  };
  meta: {
    source: string;
  };
}

interface ApiErrorResponse {
  error: string;
}

function stubFinnhubFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url.includes("/quote")) {
        return jsonResponse({ c: 185, d: 2.5, dp: 1.4, h: 187, l: 181, o: 182, pc: 182.5 });
      }

      if (url.includes("/stock/profile2")) {
        const symbol = new URL(url).searchParams.get("symbol") ?? "GOOGL";
        return jsonResponse({
          ticker: symbol,
          name: `${symbol} Live Corp`,
          exchange: "NASDAQ",
          currency: "USD",
          finnhubIndustry: "Technology",
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
          headline: "Company wins new cloud contract",
          source: "Mock Wire",
          url: "https://example.com/news",
          datetime: 1_790_000_000,
          summary: "Growth signal",
        },
      ]);
    }),
  );
}

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status }));
}
