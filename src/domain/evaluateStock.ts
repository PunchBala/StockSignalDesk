import {
  EvaluationInputSchema,
  EvaluationResultSchema,
  type ConfidenceLevel,
  type EvaluationInput,
  type EvaluationResult,
  type FactorName,
  type FactorScore,
  type FinancialSnapshot,
  type NewsItem,
  type PriceRange,
  type PriceZones,
  type RatingStatus,
} from "./stockTypes";

const FACTOR_WEIGHTS: Record<Exclude<FactorName, "news" | "safety">, number> = {
  value: 0.35,
  quality: 0.25,
  growth: 0.15,
  revisions: 0.15,
  momentum: 0.1,
};

export function evaluateStock(rawInput: EvaluationInput, evaluatedAt = new Date().toISOString()): EvaluationResult {
  const input = EvaluationInputSchema.parse(rawInput);
  const latestFinancials = findLatestFinancials(input.financials);
  const factorScores = buildFactorScores(input, latestFinancials);
  const rawScore = weightedScore(factorScores);
  const safetyScore = factorScores.find((factor) => factor.name === "safety")?.score ?? 50;
  const newsScore = factorScores.find((factor) => factor.name === "news")?.score ?? 50;
  const riskPenalty = riskPenaltyFor(input, latestFinancials, safetyScore);
  const dataPenalty = dataPenaltyFor(input.dataQuality.completeness);
  const score = clampScore(rawScore + (newsScore - 50) * 0.08 - riskPenalty - dataPenalty);
  const expectedReturnPercent = estimateExpectedReturn(score, input.dataQuality.completeness);
  const fairValue = estimateFairValue(input.price.price, expectedReturnPercent);
  const priceZones = buildPriceZones(fairValue, input.price.currency, input.price.priceUnit);
  const status = chooseStatus(input, safetyScore, priceZones);
  const riskFlags = buildRiskFlags(input, latestFinancials, safetyScore);
  const whatWouldChangeRating = buildChangeConditions(status, input.profile.region, riskFlags);

  return EvaluationResultSchema.parse({
    symbol: input.profile.symbol,
    status,
    bias: biasFor(status, input.profile.region, riskFlags),
    confidence: input.dataQuality.confidence,
    score,
    expectedReturnPercent,
    probabilityOfOutperformance: clampPercent(35 + (score - 50) * 1.25),
    factorScores,
    fairValue,
    priceZones,
    topReason: topReasonFor(status, factorScores, riskFlags, input),
    riskFlags,
    whatWouldChangeRating,
    dataQuality: input.dataQuality,
    evaluatedAt,
  });
}

function buildFactorScores(input: EvaluationInput, financials: FinancialSnapshot | null): FactorScore[] {
  return [
    {
      name: "value",
      weight: FACTOR_WEIGHTS.value,
      score: scoreValue(input, financials),
      explanation: "Valuation uses available P/E, free-cash-flow yield and price-to-sales signals.",
    },
    {
      name: "quality",
      weight: FACTOR_WEIGHTS.quality,
      score: scoreQuality(financials),
      explanation: "Quality uses margins, ROE, ROIC, cash conversion and balance-sheet strength.",
    },
    {
      name: "growth",
      weight: FACTOR_WEIGHTS.growth,
      score: scoreGrowth(input.financials),
      explanation: "Growth uses recent revenue expansion and profitability direction when available.",
    },
    {
      name: "revisions",
      weight: FACTOR_WEIGHTS.revisions,
      score: scoreRevisions(input.news),
      explanation: "Revisions are approximated in V1 from recent news tone until analyst estimates are available.",
    },
    {
      name: "momentum",
      weight: FACTOR_WEIGHTS.momentum,
      score: scoreMomentum(input.price.changePercent),
      explanation: "Momentum uses the latest price move as a lightweight V1 proxy.",
    },
    {
      name: "safety",
      weight: 0,
      score: scoreSafety(input, financials),
      explanation: "Safety penalizes weak data, leverage, cash burn, poor liquidity and critical provider issues.",
    },
    {
      name: "news",
      weight: 0,
      score: scoreNews(input.news),
      explanation: "News impact is asymmetric: negative news is allowed to hurt more than positive news can help.",
    },
  ];
}

function scoreValue(input: EvaluationInput, financials: FinancialSnapshot | null): number {
  if (!financials) {
    return input.profile.region === "UK" ? 35 : 45;
  }

  const peScore = inverseRatioScore(financials.ratios.pe, 12, 35);
  const psScore = inverseRatioScore(financials.ratios.ps, 2, 15);
  const fcfYieldScore = ratioScore(financials.ratios.fcfYield, 0.02, 0.08);
  const positiveFcfBonus = positive(financials.freeCashFlow) ? 8 : 0;

  return averageKnown([peScore, psScore, fcfYieldScore], 50) + positiveFcfBonus;
}

function scoreQuality(financials: FinancialSnapshot | null): number {
  if (!financials) {
    return 42;
  }

  const marginScore = ratioScore(financials.ratios.grossMargin, 0.25, 0.65);
  const ebitScore = ratioScore(financials.ratios.ebitMargin, 0.08, 0.3);
  const roeScore = ratioScore(financials.ratios.roe, 0.08, 0.25);
  const roicScore = ratioScore(financials.ratios.roic, 0.08, 0.22);
  const cashConversionScore =
    known(financials.operatingCashFlow) && known(financials.netIncome) && Number(financials.netIncome) > 0
      ? ratioScore(Number(financials.operatingCashFlow) / Number(financials.netIncome), 0.7, 1.2)
      : null;

  return averageKnown([marginScore, ebitScore, roeScore, roicScore, cashConversionScore], 50);
}

function scoreGrowth(financials: FinancialSnapshot[]): number {
  const sorted = financials
    .filter((snapshot) => known(snapshot.revenue))
    .sort((a, b) => b.fiscalDate.localeCompare(a.fiscalDate));

  if (sorted.length < 2) {
    return sorted.length === 1 ? 55 : 40;
  }

  const latest = Number(sorted[0].revenue);
  const prior = Number(sorted[1].revenue);

  if (prior <= 0) {
    return 50;
  }

  return ratioScore((latest - prior) / prior, 0.03, 0.3) ?? 50;
}

function scoreRevisions(news: NewsItem[]): number {
  const newsScore = scoreNews(news);
  return clampScore(50 + (newsScore - 50) * 0.65);
}

function scoreMomentum(changePercent?: number | null): number {
  if (!known(changePercent)) {
    return 50;
  }

  return clampScore(50 + Number(changePercent) * 2.5);
}

function scoreSafety(input: EvaluationInput, financials: FinancialSnapshot | null): number {
  let score = input.dataQuality.completeness * 0.55 + 35;

  if (!financials) {
    score -= 18;
  }

  if (financials?.ratios.debtToEquity != null && financials.ratios.debtToEquity > 2) {
    score -= 18;
  }

  if (financials?.freeCashFlow != null && financials.freeCashFlow < 0) {
    score -= 14;
  }

  if (input.dataQuality.issues.some((issue) => issue.severity === "critical")) {
    score -= 35;
  }

  return clampScore(score);
}

function scoreNews(news: NewsItem[]): number {
  if (news.length === 0) {
    return 50;
  }

  const impact = news.reduce((sum, item) => {
    if (item.impact === "positive") return sum + 4;
    if (item.impact === "negative") return sum - 7;
    return sum;
  }, 0);

  return clampScore(50 + impact);
}

function chooseStatus(
  input: EvaluationInput,
  safetyScore: number,
  priceZones: PriceZones,
): RatingStatus {
  const hasCriticalIssue = input.dataQuality.issues.some((issue) => issue.severity === "critical");

  if (input.dataQuality.completeness < 30 || !input.price.price) {
    return "unrated";
  }

  const priceZoneStatus = statusFromCurrentPrice(input.price.price, priceZones);

  if (hasCriticalIssue || safetyScore < 25) {
    return "hard_sell";
  }

  return priceZoneStatus;
}

function weightedScore(factors: FactorScore[]): number {
  return clampScore(factors.reduce((sum, factor) => sum + factor.score * factor.weight, 0));
}

function riskPenaltyFor(input: EvaluationInput, financials: FinancialSnapshot | null, safetyScore: number): number {
  let penalty = safetyScore < 45 ? 6 : 0;

  if (input.profile.region === "UK" && input.financials.length === 0) {
    penalty += 7;
  }

  if (financials?.ratios.ps != null && financials.ratios.ps > 25) {
    penalty += 10;
  }

  return penalty;
}

function dataPenaltyFor(completeness: number): number {
  if (completeness < 40) return 12;
  if (completeness < 60) return 6;
  return 0;
}

function estimateExpectedReturn(score: number, completeness: number): number {
  const uncertaintyDiscount = completeness < 60 ? 4 : 0;
  return Math.round((score - 50) * 0.85 - uncertaintyDiscount);
}

function estimateFairValue(price: number, expectedReturnPercent: number): PriceRange {
  const midpoint = price * (1 + expectedReturnPercent / 100);
  const spread = Math.max(0.12, 0.28 - Math.abs(expectedReturnPercent) / 300);

  return {
    min: roundPrice(midpoint * (1 - spread)),
    max: roundPrice(midpoint * (1 + spread)),
  };
}

function buildPriceZones(fairValue: PriceRange, currency: string, priceUnit: "major" | "minor"): PriceZones {
  const min = Number(fairValue.min ?? 0);
  const max = Number(fairValue.max ?? min);
  const midpoint = (min + max) / 2;

  return {
    insaneCheap: { min: null, max: roundPrice(min * 0.72) },
    buy: { min: roundPrice(min * 0.72), max: roundPrice(min) },
    hold: { min: roundPrice(min), max: roundPrice(max) },
    sell: { min: roundPrice(max), max: roundPrice(max * 1.22) },
    hardSell: { min: roundPrice(Math.max(max * 1.22, midpoint * 1.45)), max: null },
    currency,
    priceUnit,
  };
}

function statusFromCurrentPrice(price: number, zones: PriceZones): RatingStatus {
  if (zones.hardSell.min != null && price >= zones.hardSell.min) {
    return "hard_sell";
  }

  if (zones.sell.min != null && price >= zones.sell.min) {
    return "sell";
  }

  if (zones.insaneCheap.max != null && price <= zones.insaneCheap.max) {
    return "insane_cheap";
  }

  if (zones.buy.max != null && price <= zones.buy.max) {
    return "buy";
  }

  return "hold";
}

function buildRiskFlags(input: EvaluationInput, financials: FinancialSnapshot | null, safetyScore: number): string[] {
  const flags = [...input.dataQuality.issues.map((issue) => issue.message)];

  if (!financials) {
    flags.push("Fundamentals unavailable from configured providers.");
  }

  if (financials?.ratios.ps != null && financials.ratios.ps > 25) {
    flags.push("Valuation is high relative to current revenue.");
  }

  if (financials?.freeCashFlow != null && financials.freeCashFlow < 0) {
    flags.push("Free cash flow is negative.");
  }

  if (safetyScore < 45) {
    flags.push("Safety score is weak.");
  }

  return [...new Set(flags)];
}

function buildChangeConditions(status: RatingStatus, region: string, riskFlags: string[]): string[] {
  if (status === "unrated") {
    return ["Add reliable fundamentals and news coverage to produce a rated view."];
  }

  const conditions = [
    "A materially lower price would improve the margin of safety.",
    "Stronger free cash flow, margins or balance-sheet data would improve the rating.",
  ];

  if (region === "UK") {
    conditions.push("A reliable UK fundamentals provider would improve confidence.");
  }

  if (riskFlags.length > 0) {
    conditions.push("Resolution of the main risk flags would improve the rating.");
  }

  return conditions;
}

function topReasonFor(status: RatingStatus, factors: FactorScore[], riskFlags: string[], input: EvaluationInput): string {
  if (status === "unrated") {
    return "Data is too incomplete to issue a reliable rating.";
  }

  const strongest = [...factors].sort((a, b) => b.score - a.score)[0];
  const weakest = [...factors].sort((a, b) => a.score - b.score)[0];

  if (riskFlags.length > 0 && weakest.score < 45) {
    return `${title(weakest.name)} is the main constraint: ${riskFlags[0]}`;
  }

  if (input.profile.region === "UK" && input.financials.length === 0) {
    return "UK quote data is available, but missing fundamentals limit confidence.";
  }

  return `${title(strongest.name)} is supportive, while ${title(weakest.name)} keeps the rating disciplined.`;
}

function biasFor(status: RatingStatus, region: string, riskFlags: string[]): string {
  if (status === "buy") return riskFlags.length > 0 ? "Cautious Buy" : "Buy";
  if (status === "hold") return region === "UK" && riskFlags.length > 0 ? "Low-Confidence Hold" : "Hold";
  if (status === "sell") return "Sell";
  if (status === "hard_sell") return "Hard Sell";
  if (status === "insane_cheap") return "Insane Cheap";
  return "Unrated";
}

function findLatestFinancials(financials: FinancialSnapshot[]): FinancialSnapshot | null {
  return [...financials].sort((a, b) => b.fiscalDate.localeCompare(a.fiscalDate))[0] ?? null;
}

function ratioScore(value: number | null | undefined, low: number, high: number): number | null {
  if (!known(value)) {
    return null;
  }

  return clampScore(((Number(value) - low) / (high - low)) * 70 + 20);
}

function inverseRatioScore(value: number | null | undefined, good: number, bad: number): number | null {
  if (!known(value) || Number(value) <= 0) {
    return null;
  }

  return clampScore(90 - ((Number(value) - good) / (bad - good)) * 70);
}

function averageKnown(values: Array<number | null>, fallback: number): number {
  const knownValues = values.filter((value): value is number => value != null);

  if (knownValues.length === 0) {
    return fallback;
  }

  return clampScore(knownValues.reduce((sum, value) => sum + value, 0) / knownValues.length);
}

function known(value: number | null | undefined): boolean {
  return value != null && Number.isFinite(value);
}

function positive(value: number | null | undefined): boolean {
  return known(value) && Number(value) > 0;
}

function clampScore(value: number): number {
  return Math.round(Math.min(100, Math.max(0, value)));
}

function clampPercent(value: number): number {
  return Math.round(Math.min(95, Math.max(5, value)));
}

function roundPrice(value: number): number {
  return Math.round(value * 100) / 100;
}

function title(value: string): string {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}
