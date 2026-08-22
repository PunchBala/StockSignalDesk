import { evaluateStock } from "../domain/evaluateStock";
import { findMockEvaluationInput, mockEvaluationInputs } from "../domain/mockStockInputs";
import type {
  EvaluationInput,
  EvaluationResult,
  FinancialSnapshot,
  NewsImpact,
  NewsItem,
  PriceSnapshot,
  Provider,
  StockProfile,
} from "../domain/stockTypes";

export interface ProviderEnv {
  FMP_API_KEY?: string;
  FINNHUB_API_KEY?: string;
  ALPHA_VANTAGE_API_KEY?: string;
  WATCHLIST_SYMBOLS?: string;
}

export interface ProviderStockDetail {
  input: EvaluationInput;
  evaluation: EvaluationResult;
  source: "live" | "mock";
}

export interface StockListItem {
  symbol: string;
  companyName: string;
  region: "US" | "UK";
  price: number;
  currency: string;
  priceUnit: "major" | "minor";
  changePercent: number | null;
  status: EvaluationResult["status"];
  bias: string;
  confidence: EvaluationResult["confidence"];
  score: number;
  topReason: string;
  fairValue: EvaluationResult["fairValue"];
  dataQuality: EvaluationResult["dataQuality"];
  evaluatedAt: string;
}

const DEFAULT_WATCHLIST = ["APP", "RKLB", "GOOGL", "RR.LON"];

export function getWatchlistSymbols(env: ProviderEnv = {}) {
  return (env.WATCHLIST_SYMBOLS ?? DEFAULT_WATCHLIST.join(","))
    .split(",")
    .map((symbol) => symbol.trim().toUpperCase())
    .filter(Boolean);
}

export async function getStockList(env: ProviderEnv = {}, fetcher: typeof fetch = fetch) {
  const details = (await Promise.all(getWatchlistSymbols(env).map((symbol) => getStockDetail(symbol, env, fetcher)))).filter(
    (detail): detail is ProviderStockDetail => detail != null,
  );
  const liveCount = details.filter((detail) => detail.source === "live").length;

  return {
    stocks: details.map((detail) => toStockListItem(detail.input, detail.evaluation)),
    source: liveCount === details.length ? "live" : liveCount > 0 ? "live+mock-fallback" : "mock",
  };
}

export async function getStockDetail(
  symbol: string,
  env: ProviderEnv = {},
  fetcher: typeof fetch = fetch,
): Promise<ProviderStockDetail | null> {
  const normalizedSymbol = symbol.toUpperCase();

  try {
    const liveInput = normalizedSymbol.endsWith(".L") || normalizedSymbol.endsWith(".LON")
      ? await getAlphaVantageUkInput(normalizedSymbol, env, fetcher)
      : await getFinnhubUsInput(normalizedSymbol, env, fetcher);

    if (liveInput) {
      return {
        input: liveInput,
        evaluation: evaluateStock(liveInput),
        source: "live",
      };
    }
  } catch {
    return getMockDetail(normalizedSymbol);
  }

  return getMockDetail(normalizedSymbol);
}

export function getMockDetail(symbol: string): ProviderStockDetail | null {
  const input = findMockEvaluationInput(symbol);

  if (!input) {
    return null;
  }

  return {
    input,
    evaluation: evaluateStock(input),
    source: "mock",
  };
}

export function toStockListItem(input: EvaluationInput, evaluation = evaluateStock(input)): StockListItem {
  return {
    symbol: input.profile.symbol,
    companyName: input.profile.companyName,
    region: input.profile.region,
    price: input.price.price,
    currency: input.price.currency,
    priceUnit: input.price.priceUnit,
    changePercent: input.price.changePercent ?? null,
    status: evaluation.status,
    bias: evaluation.bias,
    confidence: evaluation.confidence,
    score: evaluation.score,
    topReason: evaluation.topReason,
    fairValue: evaluation.fairValue,
    dataQuality: evaluation.dataQuality,
    evaluatedAt: evaluation.evaluatedAt,
  };
}

async function getFinnhubUsInput(symbol: string, env: ProviderEnv, fetcher: typeof fetch): Promise<EvaluationInput | null> {
  if (!env.FINNHUB_API_KEY) {
    return null;
  }

  const [quote, profile, metrics, news] = await Promise.all([
    fetchJson<FinnhubQuote>(fetcher, finnhubUrl("quote", { symbol, token: env.FINNHUB_API_KEY })),
    fetchJson<FinnhubProfile>(fetcher, finnhubUrl("stock/profile2", { symbol, token: env.FINNHUB_API_KEY })),
    fetchJson<FinnhubMetricResponse>(
      fetcher,
      finnhubUrl("stock/metric", { symbol, metric: "all", token: env.FINNHUB_API_KEY }),
    ),
    fetchJson<FinnhubNewsItem[]>(
      fetcher,
      finnhubUrl("company-news", {
        symbol,
        from: dateDaysAgo(7),
        to: dateDaysAgo(0),
        token: env.FINNHUB_API_KEY,
      }),
    ),
  ]);

  if (!quote?.c || quote.c <= 0) {
    return null;
  }

  const now = new Date().toISOString();
  const metric = metrics?.metric ?? {};
  const companyName = profile?.name || symbol;
  const currency = profile?.currency || "USD";
  const marketCap = numberOrNull(profile?.marketCapitalization) != null ? Number(profile?.marketCapitalization) * 1_000_000 : null;
  const shareCount = numberOrNull(profile?.shareOutstanding) != null ? Number(profile?.shareOutstanding) * 1_000_000 : null;
  const revenue = estimateRevenue(metric, marketCap);
  const revenueGrowth = firstNumber(metric, ["revenueGrowthTTMYoy", "revenueGrowthQuarterlyYoy", "revenueGrowth3Y"]);
  const priorRevenue = revenue != null && revenueGrowth != null && revenueGrowth > -0.95 ? revenue / (1 + revenueGrowth / 100) : null;

  const profileSnapshot: StockProfile = {
    symbol,
    displaySymbol: profile?.ticker || symbol,
    companyName,
    region: "US",
    exchange: profile?.exchange || "US",
    currency,
    priceUnit: "major",
    assetType: "common_stock",
    sector: null,
    industry: profile?.finnhubIndustry ?? null,
    marketCap,
    shareCount,
    source: "finnhub",
    updatedAt: now,
  };

  const price: PriceSnapshot = {
    symbol,
    asOf: now,
    currency,
    priceUnit: "major",
    price: quote.c,
    previousClose: numberOrNull(quote.pc),
    open: numberOrNull(quote.o),
    dayHigh: numberOrNull(quote.h),
    dayLow: numberOrNull(quote.l),
    change: numberOrNull(quote.d),
    changePercent: numberOrNull(quote.dp),
    source: "finnhub",
  };

  const latestFinancials = buildFinnhubFinancials(symbol, currency, now, metric, quote.c, revenue);
  const previousFinancials: FinancialSnapshot = {
    symbol,
    fiscalPeriod: "annual",
    fiscalDate: previousYearEndDate(),
    currency,
    revenue: priorRevenue,
    ratios: {},
    source: "finnhub",
    updatedAt: now,
  };
  const financials = priorRevenue
    ? [
        latestFinancials,
        previousFinancials,
      ]
    : [latestFinancials];

  return {
    profile: profileSnapshot,
    price,
    financials,
    news: buildFinnhubNews(symbol, now, news ?? []),
    dataQuality: {
      completeness: scoreCompleteness([quote, profile, metrics], 78),
      confidence: "medium_high",
      issues: [],
      providerStatuses: [
        providerStatus("finnhub", "quote", Boolean(quote?.c), now),
        providerStatus("finnhub", "profile", Boolean(profile?.name), now),
        providerStatus("finnhub", "metrics", Boolean(metrics?.metric), now),
        providerStatus("finnhub", "news", Array.isArray(news), now),
      ],
    },
  };
}

async function getAlphaVantageUkInput(
  symbol: string,
  env: ProviderEnv,
  fetcher: typeof fetch,
): Promise<EvaluationInput | null> {
  if (!env.ALPHA_VANTAGE_API_KEY) {
    return null;
  }

  const alphaSymbol = symbol.replace(".LON", ".L");
  const payload = await fetchJson<AlphaVantageQuoteResponse>(
    fetcher,
    alphaVantageUrl({ function: "GLOBAL_QUOTE", symbol: alphaSymbol, apikey: env.ALPHA_VANTAGE_API_KEY }),
  );
  const quote = payload?.["Global Quote"];
  const price = parseNumericString(quote?.["05. price"]);

  if (!price || price <= 0) {
    return null;
  }

  const now = new Date().toISOString();
  const changePercent = parseNumericString(quote?.["10. change percent"]?.replace("%", ""));

  return {
    profile: {
      symbol: symbol.replace(".L", ".LON"),
      displaySymbol: alphaSymbol,
      companyName: findMockEvaluationInput(symbol)?.profile.companyName ?? symbol,
      region: "UK",
      exchange: "LSE",
      currency: "GBP",
      priceUnit: "minor",
      assetType: "common_stock",
      sector: null,
      industry: null,
      marketCap: null,
      shareCount: null,
      source: "alpha-vantage",
      updatedAt: now,
    },
    price: {
      symbol: symbol.replace(".L", ".LON"),
      asOf: now,
      currency: "GBP",
      priceUnit: "minor",
      price,
      previousClose: parseNumericString(quote?.["08. previous close"]),
      open: parseNumericString(quote?.["02. open"]),
      dayHigh: parseNumericString(quote?.["03. high"]),
      dayLow: parseNumericString(quote?.["04. low"]),
      change: parseNumericString(quote?.["09. change"]),
      changePercent,
      source: "alpha-vantage",
    },
    financials: [],
    news: [],
    dataQuality: {
      completeness: 35,
      confidence: "low",
      issues: [
        {
          code: "uk_quote_only",
          severity: "warning",
          message: "UK quote is live, but fundamentals and news still need a reliable free provider.",
        },
      ],
      providerStatuses: [providerStatus("alpha-vantage", "globalQuote", true, now)],
    },
  };
}

function buildFinnhubFinancials(
  symbol: string,
  currency: string,
  now: string,
  metric: Record<string, unknown>,
  price: number,
  revenue: number | null,
): FinancialSnapshot {
  const fcfPerShare = firstNumber(metric, ["freeCashFlowPerShareTTM", "fcfPerShareTTM"]);
  const shareCount = firstNumber(metric, ["shareOutstanding", "sharesOutstanding"]);
  const freeCashFlow = fcfPerShare != null && shareCount != null ? fcfPerShare * shareCount * 1_000_000 : null;

  return {
    symbol,
    fiscalPeriod: "ttm",
    fiscalDate: currentYearEndDate(),
    currency,
    revenue,
    freeCashFlow,
    ratios: {
      grossMargin: percentMetric(metric, ["grossMarginTTM", "grossMarginAnnual"]),
      ebitMargin: percentMetric(metric, ["operatingMarginTTM", "ebitMarginTTM", "operatingMarginAnnual"]),
      netMargin: percentMetric(metric, ["netProfitMarginTTM", "netMarginTTM"]),
      roe: percentMetric(metric, ["roeTTM", "roeAnnual"]),
      roic: percentMetric(metric, ["roicTTM", "roicAnnual"]),
      debtToEquity: firstNumber(metric, ["totalDebt/totalEquityAnnual", "debtToEquityAnnual"]),
      currentRatio: firstNumber(metric, ["currentRatioAnnual", "currentRatioQuarterly"]),
      pe: firstNumber(metric, ["peBasicExclExtraTTM", "peNormalizedAnnual", "peTTM"]),
      ps: firstNumber(metric, ["psTTM", "psAnnual"]),
      fcfYield: fcfPerShare != null ? fcfPerShare / price : percentMetric(metric, ["currentFreeCashFlowYieldTTM"]),
    },
    source: "finnhub",
    updatedAt: now,
  };
}

function buildFinnhubNews(symbol: string, now: string, news: FinnhubNewsItem[]): NewsItem[] {
  return news.slice(0, 5).map((item, index) => ({
    id: String(item.id ?? `${symbol}-${index}`),
    symbol,
    headline: item.headline || `${symbol} news update`,
    sourceName: item.source || "Finnhub",
    url: item.url || "https://finnhub.io",
    publishedAt: item.datetime ? new Date(item.datetime * 1000).toISOString() : now,
    summary: item.summary || null,
    impact: inferNewsImpact(item.headline, item.summary),
    affectedFactors: ["news"],
    source: "finnhub",
  }));
}

async function fetchJson<T>(fetcher: typeof fetch, url: string): Promise<T | null> {
  const response = await fetcher(url);

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json().catch(() => null)) as T | null;
  return hasProviderNotice(payload) ? null : payload;
}

function hasProviderNotice(payload: unknown) {
  return (
    payload != null &&
    typeof payload === "object" &&
    ["error", "Error Message", "Information", "Note"].some((key) => key in payload)
  );
}

function finnhubUrl(path: string, params: Record<string, string>) {
  return buildUrl(`https://finnhub.io/api/v1/${path}`, params);
}

function alphaVantageUrl(params: Record<string, string>) {
  return buildUrl("https://www.alphavantage.co/query", params);
}

function buildUrl(base: string, params: Record<string, string>) {
  const url = new URL(base);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.toString();
}

function estimateRevenue(metric: Record<string, unknown>, marketCap: number | null) {
  const ps = firstNumber(metric, ["psTTM", "psAnnual"]);
  return marketCap != null && ps != null && ps > 0 ? marketCap / ps : null;
}

function firstNumber(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = numberOrNull(source[key]);
    if (value != null) return value;
  }

  return null;
}

function percentMetric(source: Record<string, unknown>, keys: string[]) {
  const value = firstNumber(source, keys);

  if (value == null) return null;
  return Math.abs(value) > 1.5 ? value / 100 : value;
}

function numberOrNull(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") return parseNumericString(value);
  return null;
}

function parseNumericString(value?: string) {
  if (!value) return null;
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function providerStatus(provider: Provider, capability: string, ok: boolean, checkedAt: string) {
  return {
    provider,
    capability,
    status: ok ? "available" : "limited",
    checkedAt,
    message: ok ? undefined : "Provider did not return usable data for this capability.",
  } as const;
}

function scoreCompleteness(payloads: unknown[], base: number) {
  const missing = payloads.filter((payload) => !payload).length;
  return Math.max(35, base - missing * 12);
}

function inferNewsImpact(headline?: string, summary?: string): NewsImpact {
  const text = `${headline ?? ""} ${summary ?? ""}`.toLowerCase();
  const negative = ["miss", "cut", "lawsuit", "probe", "downgrade", "falls", "drop", "risk"];
  const positive = ["beat", "raises", "upgrade", "wins", "growth", "record", "surge", "contract"];

  if (negative.some((term) => text.includes(term))) return "negative";
  if (positive.some((term) => text.includes(term))) return "positive";
  return "neutral";
}

function dateDaysAgo(daysAgo: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

function currentYearEndDate() {
  return `${new Date().getUTCFullYear()}-12-31`;
}

function previousYearEndDate() {
  return `${new Date().getUTCFullYear() - 1}-12-31`;
}

interface FinnhubQuote {
  c?: number;
  d?: number;
  dp?: number;
  h?: number;
  l?: number;
  o?: number;
  pc?: number;
}

interface FinnhubProfile {
  ticker?: string;
  name?: string;
  exchange?: string;
  currency?: string;
  finnhubIndustry?: string;
  marketCapitalization?: number;
  shareOutstanding?: number;
}

interface FinnhubMetricResponse {
  metric?: Record<string, unknown>;
}

interface FinnhubNewsItem {
  id?: number;
  headline?: string;
  source?: string;
  url?: string;
  datetime?: number;
  summary?: string;
}

interface AlphaVantageQuoteResponse {
  "Global Quote"?: {
    "02. open"?: string;
    "03. high"?: string;
    "04. low"?: string;
    "05. price"?: string;
    "08. previous close"?: string;
    "09. change"?: string;
    "10. change percent"?: string;
  };
}
