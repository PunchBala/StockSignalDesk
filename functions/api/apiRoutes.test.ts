import { describe, expect, it } from "vitest";
import { onRequestGet } from "./[[path]]";

describe("mock API routes", () => {
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

  it("returns evaluated mock stocks", async () => {
    const response = await callRoute("/api/stocks");
    const body = (await response.json()) as StocksListResponse;

    expect(response.status).toBe(200);
    expect(body.meta).toEqual({ count: 4, source: "mock" });
    expect(body.data.map((stock: { symbol: string }) => stock.symbol)).toContain("RKLB");
    expect(body.data.every((stock: { status: string; score: number }) => stock.status && stock.score >= 0)).toBe(true);
  });

  it("returns a full stock detail payload", async () => {
    const response = await callRoute("/api/stocks/RKLB");
    const body = (await response.json()) as StockDetailResponse;

    expect(response.status).toBe(200);
    expect(body.data.profile.symbol).toBe("RKLB");
    expect(body.data.evaluation.status).toBe("hold");
    expect(body.data.evaluation.riskFlags).toContain("Valuation is high relative to current revenue.");
  });

  it("returns 404 for unknown symbols", async () => {
    const response = await callRoute("/api/stocks/NOPE");
    const body = (await response.json()) as NotFoundResponse;

    expect(response.status).toBe(404);
    expect(body.error).toBe("Stock not found");
    expect(body.availableSymbols).toContain("APP");
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
}

interface NotFoundResponse {
  error: string;
  availableSymbols: string[];
}
