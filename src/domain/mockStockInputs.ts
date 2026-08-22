import type { EvaluationInput } from "./stockTypes";

const asOf = "2026-08-22T12:00:00.000Z";

export const mockEvaluationInputs: EvaluationInput[] = [
  makeUsStock({
    symbol: "APP",
    companyName: "AppLovin",
    price: 320,
    changePercent: -1.2,
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
    confidence: "medium_high",
    completeness: 86,
    newsImpact: "positive",
  }),
  makeUsStock({
    symbol: "RKLB",
    companyName: "Rocket Lab",
    price: 70,
    changePercent: 1,
    revenue: 200_000_000,
    previousRevenue: 120_000_000,
    grossMargin: 0.55,
    ebitMargin: 0.12,
    roe: 0.1,
    roic: 0.08,
    pe: 25,
    ps: 26,
    fcfYield: 0.02,
    freeCashFlow: 1_000_000,
    confidence: "medium",
    completeness: 72,
    newsImpact: "positive",
  }),
  makeUsStock({
    symbol: "GOOGL",
    companyName: "Alphabet",
    price: 350,
    changePercent: 0.6,
    revenue: 420_000_000_000,
    previousRevenue: 345_000_000_000,
    grossMargin: 0.58,
    ebitMargin: 0.31,
    roe: 0.25,
    roic: 0.19,
    pe: 29,
    ps: 9,
    fcfYield: 0.028,
    freeCashFlow: 110_000_000_000,
    confidence: "medium_high",
    completeness: 88,
    newsImpact: "neutral",
  }),
  makeUkQuoteOnlyStock({
    symbol: "RR.LON",
    companyName: "Rolls-Royce Holdings",
    price: 1100,
    changePercent: 0.4,
  }),
];

export function findMockEvaluationInput(symbol: string): EvaluationInput | undefined {
  const normalizedSymbol = symbol.toUpperCase();
  return mockEvaluationInputs.find((input) => input.profile.symbol.toUpperCase() === normalizedSymbol);
}

function makeUsStock(options: UsStockOptions): EvaluationInput {
  return {
    profile: {
      symbol: options.symbol,
      displaySymbol: options.symbol,
      companyName: options.companyName,
      region: "US",
      exchange: "NASDAQ",
      currency: "USD",
      priceUnit: "major",
      assetType: "common_stock",
      sector: null,
      industry: null,
      marketCap: null,
      shareCount: null,
      source: "manual",
      updatedAt: asOf,
    },
    price: {
      symbol: options.symbol,
      asOf,
      currency: "USD",
      priceUnit: "major",
      price: options.price,
      previousClose: options.price / (1 + options.changePercent / 100),
      changePercent: options.changePercent,
      source: "manual",
    },
    financials: [
      {
        symbol: options.symbol,
        fiscalPeriod: "annual",
        fiscalDate: "2026-12-31",
        currency: "USD",
        revenue: options.revenue,
        grossProfit: options.revenue * options.grossMargin,
        operatingIncome: options.revenue * options.ebitMargin,
        netIncome: options.revenue * Math.max(options.ebitMargin * 0.7, -0.2),
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
          debtToEquity: 0.5,
        },
        source: "manual",
        updatedAt: asOf,
      },
      {
        symbol: options.symbol,
        fiscalPeriod: "annual",
        fiscalDate: "2025-12-31",
        currency: "USD",
        revenue: options.previousRevenue,
        ratios: {},
        source: "manual",
        updatedAt: asOf,
      },
    ],
    news: [
      {
        id: `${options.symbol}-mock-news`,
        symbol: options.symbol,
        headline: `${options.companyName} mock news signal`,
        sourceName: "Mock News",
        url: "https://example.com/mock-news",
        publishedAt: asOf,
        impact: options.newsImpact,
        affectedFactors: ["news"],
        source: "manual",
      },
    ],
    dataQuality: {
      completeness: options.completeness,
      confidence: options.confidence,
      issues:
        options.ps > 25
          ? [
              {
                code: "high_price_to_sales",
                severity: "warning",
                message: "Valuation is high relative to current revenue.",
              },
            ]
          : [],
      providerStatuses: [],
    },
  };
}

function makeUkQuoteOnlyStock(options: UkQuoteOnlyOptions): EvaluationInput {
  return {
    profile: {
      symbol: options.symbol,
      displaySymbol: options.symbol,
      companyName: options.companyName,
      region: "UK",
      exchange: "LSE",
      currency: "GBP",
      priceUnit: "minor",
      assetType: "common_stock",
      sector: null,
      industry: null,
      marketCap: null,
      shareCount: null,
      source: "manual",
      updatedAt: asOf,
    },
    price: {
      symbol: options.symbol,
      asOf,
      currency: "GBP",
      priceUnit: "minor",
      price: options.price,
      previousClose: options.price / (1 + options.changePercent / 100),
      changePercent: options.changePercent,
      source: "manual",
    },
    financials: [],
    news: [],
    dataQuality: {
      completeness: 25,
      confidence: "low",
      issues: [
        {
          code: "missing_uk_fundamentals",
          severity: "warning",
          message: "UK fundamentals are unavailable from configured free providers.",
        },
      ],
      providerStatuses: [],
    },
  };
}

interface UsStockOptions {
  symbol: string;
  companyName: string;
  price: number;
  changePercent: number;
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
  confidence: "low" | "medium" | "medium_high" | "high";
  completeness: number;
  newsImpact: "positive" | "neutral" | "negative";
}

interface UkQuoteOnlyOptions {
  symbol: string;
  companyName: string;
  price: number;
  changePercent: number;
}
