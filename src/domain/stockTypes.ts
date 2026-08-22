import { z } from "zod";

export const RegionSchema = z.enum(["US", "UK"]);
export const AssetTypeSchema = z.enum(["common_stock", "adr", "etf", "unknown"]);
export const ProviderSchema = z.enum(["finnhub", "fmp", "alpha-vantage", "manual"]);
export const RatingStatusSchema = z.enum(["insane_cheap", "buy", "hold", "sell", "hard_sell", "unrated"]);
export const ConfidenceLevelSchema = z.enum(["low", "medium", "medium_high", "high"]);
export const FactorNameSchema = z.enum(["value", "quality", "growth", "revisions", "momentum", "safety", "news"]);
export const NewsImpactSchema = z.enum(["positive", "neutral", "negative"]);
export const DataIssueSeveritySchema = z.enum(["info", "warning", "critical"]);

const optionalNumber = z.number().finite().nullable().optional();
const score = z.number().finite().min(0).max(100);
const isoDate = z.string().min(10);
const isoDateTime = z.string().datetime();

export const ProviderStatusSchema = z.object({
  provider: ProviderSchema,
  capability: z.string().min(1),
  status: z.enum(["available", "missing", "limited", "failed"]),
  checkedAt: isoDateTime,
  message: z.string().optional(),
});

export const StockProfileSchema = z.object({
  symbol: z.string().min(1),
  displaySymbol: z.string().min(1),
  companyName: z.string().min(1),
  region: RegionSchema,
  exchange: z.string().min(1),
  currency: z.string().min(3).max(3),
  priceUnit: z.enum(["major", "minor"]),
  assetType: AssetTypeSchema,
  sector: z.string().nullable().optional(),
  industry: z.string().nullable().optional(),
  marketCap: optionalNumber,
  shareCount: optionalNumber,
  source: ProviderSchema,
  updatedAt: isoDateTime,
});

export const PriceSnapshotSchema = z.object({
  symbol: z.string().min(1),
  asOf: isoDateTime,
  currency: z.string().min(3).max(3),
  priceUnit: z.enum(["major", "minor"]),
  price: z.number().finite().positive(),
  previousClose: optionalNumber,
  open: optionalNumber,
  dayHigh: optionalNumber,
  dayLow: optionalNumber,
  change: optionalNumber,
  changePercent: optionalNumber,
  volume: optionalNumber,
  source: ProviderSchema,
});

export const FinancialSnapshotSchema = z.object({
  symbol: z.string().min(1),
  fiscalPeriod: z.enum(["annual", "quarterly", "ttm"]),
  fiscalDate: isoDate,
  currency: z.string().min(3).max(3),
  revenue: optionalNumber,
  grossProfit: optionalNumber,
  operatingIncome: optionalNumber,
  netIncome: optionalNumber,
  operatingCashFlow: optionalNumber,
  capitalExpenditure: optionalNumber,
  freeCashFlow: optionalNumber,
  totalAssets: optionalNumber,
  totalDebt: optionalNumber,
  cashAndEquivalents: optionalNumber,
  shareholdersEquity: optionalNumber,
  sharesOutstanding: optionalNumber,
  ratios: z
    .object({
      grossMargin: optionalNumber,
      ebitMargin: optionalNumber,
      netMargin: optionalNumber,
      roe: optionalNumber,
      roic: optionalNumber,
      debtToEquity: optionalNumber,
      currentRatio: optionalNumber,
      quickRatio: optionalNumber,
      pe: optionalNumber,
      ps: optionalNumber,
      evToEbit: optionalNumber,
      fcfYield: optionalNumber,
    })
    .partial()
    .default({}),
  source: ProviderSchema,
  updatedAt: isoDateTime,
});

export const NewsItemSchema = z.object({
  id: z.string().min(1),
  symbol: z.string().min(1),
  headline: z.string().min(1),
  sourceName: z.string().min(1),
  url: z.string().url(),
  publishedAt: isoDateTime,
  summary: z.string().nullable().optional(),
  impact: NewsImpactSchema,
  affectedFactors: z.array(FactorNameSchema).default([]),
  source: ProviderSchema,
});

export const DataQualitySchema = z.object({
  completeness: score,
  confidence: ConfidenceLevelSchema,
  issues: z
    .array(
      z.object({
        code: z.string().min(1),
        severity: DataIssueSeveritySchema,
        message: z.string().min(1),
      }),
    )
    .default([]),
  providerStatuses: z.array(ProviderStatusSchema).default([]),
});

export const EvaluationInputSchema = z.object({
  profile: StockProfileSchema,
  price: PriceSnapshotSchema,
  financials: z.array(FinancialSnapshotSchema).default([]),
  news: z.array(NewsItemSchema).default([]),
  dataQuality: DataQualitySchema,
});

export const FactorScoreSchema = z.object({
  name: FactorNameSchema,
  score,
  weight: z.number().finite().min(0).max(1),
  explanation: z.string().min(1),
});

export const PriceRangeSchema = z.object({
  min: optionalNumber,
  max: optionalNumber,
});

export const PriceZonesSchema = z.object({
  insaneCheap: PriceRangeSchema,
  buy: PriceRangeSchema,
  hold: PriceRangeSchema,
  sell: PriceRangeSchema,
  hardSell: PriceRangeSchema,
  currency: z.string().min(3).max(3),
  priceUnit: z.enum(["major", "minor"]),
});

export const EvaluationResultSchema = z.object({
  symbol: z.string().min(1),
  status: RatingStatusSchema,
  bias: z.string().min(1),
  confidence: ConfidenceLevelSchema,
  score,
  expectedReturnPercent: optionalNumber,
  probabilityOfOutperformance: optionalNumber,
  factorScores: z.array(FactorScoreSchema),
  fairValue: PriceRangeSchema,
  priceZones: PriceZonesSchema,
  topReason: z.string().min(1),
  riskFlags: z.array(z.string()).default([]),
  whatWouldChangeRating: z.array(z.string()).default([]),
  dataQuality: DataQualitySchema,
  evaluatedAt: isoDateTime,
});

export type Region = z.infer<typeof RegionSchema>;
export type AssetType = z.infer<typeof AssetTypeSchema>;
export type Provider = z.infer<typeof ProviderSchema>;
export type RatingStatus = z.infer<typeof RatingStatusSchema>;
export type ConfidenceLevel = z.infer<typeof ConfidenceLevelSchema>;
export type FactorName = z.infer<typeof FactorNameSchema>;
export type NewsImpact = z.infer<typeof NewsImpactSchema>;
export type ProviderStatus = z.infer<typeof ProviderStatusSchema>;
export type StockProfile = z.infer<typeof StockProfileSchema>;
export type PriceSnapshot = z.infer<typeof PriceSnapshotSchema>;
export type FinancialSnapshot = z.infer<typeof FinancialSnapshotSchema>;
export type NewsItem = z.infer<typeof NewsItemSchema>;
export type DataQuality = z.infer<typeof DataQualitySchema>;
export type EvaluationInput = z.infer<typeof EvaluationInputSchema>;
export type FactorScore = z.infer<typeof FactorScoreSchema>;
export type PriceRange = z.infer<typeof PriceRangeSchema>;
export type PriceZones = z.infer<typeof PriceZonesSchema>;
export type EvaluationResult = z.infer<typeof EvaluationResultSchema>;

