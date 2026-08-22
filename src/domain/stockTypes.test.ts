import { describe, expect, it } from "vitest";
import {
  EvaluationInputSchema,
  EvaluationResultSchema,
  PriceSnapshotSchema,
  RatingStatusSchema,
  type EvaluationInput,
} from "./stockTypes";

const evaluatedAt = "2026-08-22T11:30:00.000Z";

const usInput: EvaluationInput = {
  profile: {
    symbol: "RKLB",
    displaySymbol: "RKLB",
    companyName: "Rocket Lab",
    region: "US",
    exchange: "NASDAQ",
    currency: "USD",
    priceUnit: "major",
    assetType: "common_stock",
    sector: "Industrials",
    industry: "Aerospace & Defense",
    marketCap: 42000000000,
    shareCount: 629000000,
    source: "finnhub",
    updatedAt: evaluatedAt,
  },
  price: {
    symbol: "RKLB",
    asOf: evaluatedAt,
    currency: "USD",
    priceUnit: "major",
    price: 70.2,
    previousClose: 71.9,
    change: -1.7,
    changePercent: -2.36,
    volume: 12000000,
    source: "finnhub",
  },
  financials: [
    {
      symbol: "RKLB",
      fiscalPeriod: "quarterly",
      fiscalDate: "2026-06-30",
      currency: "USD",
      revenue: 200300000,
      grossProfit: 76500000,
      netIncome: null,
      freeCashFlow: null,
      ratios: {},
      source: "fmp",
      updatedAt: evaluatedAt,
    },
  ],
  news: [
    {
      id: "rklb-1",
      symbol: "RKLB",
      headline: "Rocket Lab signs new launch contract",
      sourceName: "Example News",
      url: "https://example.com/rklb",
      publishedAt: evaluatedAt,
      impact: "positive",
      affectedFactors: ["growth", "news"],
      source: "finnhub",
    },
  ],
  dataQuality: {
    completeness: 82,
    confidence: "medium_high",
    issues: [],
    providerStatuses: [
      {
        provider: "finnhub",
        capability: "quote",
        status: "available",
        checkedAt: evaluatedAt,
      },
    ],
  },
};

describe("stock domain contracts", () => {
  it("accepts a rich US evaluation input", () => {
    expect(EvaluationInputSchema.parse(usInput).profile.symbol).toBe("RKLB");
  });

  it("accepts a UK quote-only input with lower completeness", () => {
    const ukInput: EvaluationInput = {
      ...usInput,
      profile: {
        ...usInput.profile,
        symbol: "RR.LON",
        displaySymbol: "RR.LON",
        companyName: "Rolls-Royce Holdings",
        region: "UK",
        exchange: "LSE",
        currency: "GBP",
        priceUnit: "minor",
        marketCap: null,
        source: "alpha-vantage",
      },
      price: {
        symbol: "RR.LON",
        asOf: evaluatedAt,
        currency: "GBP",
        priceUnit: "minor",
        price: 1100,
        source: "alpha-vantage",
      },
      financials: [],
      news: [],
      dataQuality: {
        completeness: 35,
        confidence: "low",
        issues: [
          {
            code: "missing_fundamentals",
            severity: "warning",
            message: "UK fundamentals are not available from the configured free providers.",
          },
        ],
        providerStatuses: [],
      },
    };

    const parsed = EvaluationInputSchema.parse(ukInput);

    expect(parsed.profile.region).toBe("UK");
    expect(parsed.dataQuality.confidence).toBe("low");
  });

  it("rejects price snapshots without a positive price", () => {
    expect(() =>
      PriceSnapshotSchema.parse({
        symbol: "RKLB",
        asOf: evaluatedAt,
        currency: "USD",
        priceUnit: "major",
        price: 0,
        source: "finnhub",
      }),
    ).toThrow();
  });

  it("only accepts known rating statuses", () => {
    expect(RatingStatusSchema.safeParse("buy").success).toBe(true);
    expect(RatingStatusSchema.safeParse("strong_buy").success).toBe(false);
  });

  it("validates an explainable evaluation result", () => {
    const result = EvaluationResultSchema.parse({
      symbol: "RKLB",
      status: "hold",
      bias: "Speculative Hold",
      confidence: "medium",
      score: 53,
      factorScores: [
        {
          name: "growth",
          score: 86,
          weight: 0.15,
          explanation: "Revenue and backlog growth are strong.",
        },
      ],
      fairValue: {
        min: 45,
        max: 80,
      },
      priceZones: {
        insaneCheap: { min: null, max: 25 },
        buy: { min: 25, max: 45 },
        hold: { min: 45, max: 80 },
        sell: { min: 80, max: 110 },
        hardSell: { min: 110, max: null },
        currency: "USD",
        priceUnit: "major",
      },
      topReason: "Strong growth, but valuation already prices in a lot of execution.",
      riskFlags: ["High valuation"],
      whatWouldChangeRating: ["Neutron execution improves with clear commercial pipeline."],
      dataQuality: usInput.dataQuality,
      evaluatedAt,
    });

    expect(result.priceZones.hold.max).toBe(80);
  });
});
