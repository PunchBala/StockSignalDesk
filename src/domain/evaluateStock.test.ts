import { describe, expect, it } from "vitest";
import { evaluateStock } from "./evaluateStock";
import type { EvaluationInput } from "./stockTypes";

const now = "2026-08-22T12:40:00.000Z";

describe("evaluateStock", () => {
  it("rates a high-quality cash-generative stock as buy", () => {
    const result = evaluateStock(makeInput(), now);

    expect(result.status).toBe("buy");
    expect(result.score).toBeGreaterThanOrEqual(64);
    expect(result.factorScores.map((factor) => factor.name)).toContain("value");
  });

  it("keeps a high-growth but expensive speculative stock at hold", () => {
    const result = evaluateStock(
      makeInput({
        symbol: "RKLB",
        price: 70,
        revenue: 200_000_000,
        previousRevenue: 120_000_000,
        ps: 45,
        grossMargin: 0.38,
        ebitMargin: -0.08,
        fcfYield: -0.02,
        freeCashFlow: -80_000_000,
        completeness: 72,
        confidence: "medium",
      }),
      now,
    );

    expect(result.status).toBe("hold");
    expect(result.riskFlags).toContain("Valuation is high relative to current revenue.");
  });

  it("marks critical data or business risk as hard sell", () => {
    const result = evaluateStock(
      makeInput({
        completeness: 75,
        issues: [
          {
            code: "critical_accounting_risk",
            severity: "critical",
            message: "Critical accounting risk detected.",
          },
        ],
      }),
      now,
    );

    expect(result.status).toBe("hard_sell");
  });

  it("allows UK quote-only input but downgrades it to unrated when completeness is too low", () => {
    const result = evaluateStock(
      makeInput({
        symbol: "RR.LON",
        companyName: "Rolls-Royce Holdings",
        region: "UK",
        exchange: "LSE",
        currency: "GBP",
        priceUnit: "minor",
        source: "alpha-vantage",
        price: 1100,
        financials: [],
        completeness: 25,
        confidence: "low",
        issues: [
          {
            code: "missing_uk_fundamentals",
            severity: "warning",
            message: "UK fundamentals are unavailable from configured free providers.",
          },
        ],
      }),
      now,
    );

    expect(result.status).toBe("unrated");
    expect(result.topReason).toContain("too incomplete");
  });
});

function makeInput(overrides: Partial<FixtureOptions> = {}): EvaluationInput {
  const options = {
    symbol: "APP",
    companyName: "AppLovin",
    region: "US",
    exchange: "NASDAQ",
    currency: "USD",
    priceUnit: "major",
    source: "finnhub",
    price: 320,
    revenue: 7_700_000_000,
    previousRevenue: 5_000_000_000,
    grossMargin: 0.78,
    ebitMargin: 0.42,
    roe: 0.28,
    roic: 0.22,
    pe: 21,
    ps: 13,
    fcfYield: 0.035,
    freeCashFlow: 3_400_000_000,
    completeness: 86,
    confidence: "medium_high",
    issues: [],
    financials: undefined,
    ...overrides,
  } satisfies FixtureOptions;

  const financials =
    options.financials ??
    ([
      {
        symbol: options.symbol,
        fiscalPeriod: "annual",
        fiscalDate: "2026-12-31",
        currency: options.currency,
        revenue: options.revenue,
        grossProfit: options.revenue * options.grossMargin,
        operatingIncome: options.revenue * options.ebitMargin,
        netIncome: options.revenue * 0.28,
        operatingCashFlow: Math.max(options.freeCashFlow, 0) + 300_000_000,
        freeCashFlow: options.freeCashFlow,
        ratios: {
          grossMargin: options.grossMargin,
          ebitMargin: options.ebitMargin,
          roe: options.roe,
          roic: options.roic,
          pe: options.pe,
          ps: options.ps,
          fcfYield: options.fcfYield,
          debtToEquity: 0.4,
        },
        source: "fmp",
        updatedAt: now,
      },
      {
        symbol: options.symbol,
        fiscalPeriod: "annual",
        fiscalDate: "2025-12-31",
        currency: options.currency,
        revenue: options.previousRevenue,
        ratios: {},
        source: "fmp",
        updatedAt: now,
      },
    ] as EvaluationInput["financials"]);

  return {
    profile: {
      symbol: options.symbol,
      displaySymbol: options.symbol,
      companyName: options.companyName,
      region: options.region,
      exchange: options.exchange,
      currency: options.currency,
      priceUnit: options.priceUnit,
      assetType: "common_stock",
      sector: null,
      industry: null,
      marketCap: null,
      shareCount: null,
      source: options.source,
      updatedAt: now,
    },
    price: {
      symbol: options.symbol,
      asOf: now,
      currency: options.currency,
      priceUnit: options.priceUnit,
      price: options.price,
      previousClose: options.price * 0.99,
      changePercent: 1,
      source: options.source,
    },
    financials,
    news: [
      {
        id: `${options.symbol}-news-1`,
        symbol: options.symbol,
        headline: `${options.companyName} reports strong demand`,
        sourceName: "Example News",
        url: "https://example.com/news",
        publishedAt: now,
        impact: "positive",
        affectedFactors: ["growth", "news"],
        source: "finnhub",
      },
    ],
    dataQuality: {
      completeness: options.completeness,
      confidence: options.confidence,
      issues: options.issues,
      providerStatuses: [],
    },
  };
}

interface FixtureOptions {
  symbol: string;
  companyName: string;
  region: "US" | "UK";
  exchange: string;
  currency: string;
  priceUnit: "major" | "minor";
  source: "finnhub" | "fmp" | "alpha-vantage" | "manual";
  price: number;
  revenue: number;
  previousRevenue: number;
  grossMargin: number;
  ebitMargin: number;
  roe: number;
  roic: number;
  pe: number;
  ps: number;
  fcfYield: number;
  freeCashFlow: number;
  completeness: number;
  confidence: "low" | "medium" | "medium_high" | "high";
  issues: EvaluationInput["dataQuality"]["issues"];
  financials?: EvaluationInput["financials"];
}

