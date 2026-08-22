import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  FileText,
  Newspaper,
  RefreshCw,
  ShieldAlert,
  Target,
  TrendingUp,
} from "lucide-react";
import { evaluateStock } from "./domain/evaluateStock";
import { findMockEvaluationInput, mockEvaluationInputs } from "./domain/mockStockInputs";
import type {
  ConfidenceLevel,
  EvaluationInput,
  EvaluationResult,
  FactorName,
  FinancialSnapshot,
  PriceRange,
  PriceZones,
  RatingStatus,
} from "./domain/stockTypes";
import "./styles.css";

interface StockListItem {
  symbol: string;
  companyName: string;
  region: "US" | "UK";
  price: number;
  currency: string;
  priceUnit: "major" | "minor";
  changePercent: number | null;
  status: RatingStatus;
  bias: string;
  confidence: ConfidenceLevel;
  score: number;
  topReason: string;
  fairValue: PriceRange;
  dataQuality: EvaluationResult["dataQuality"];
  evaluatedAt: string;
}

interface StockDetail {
  input: EvaluationInput;
  evaluation: EvaluationResult;
  source: string;
}

interface StocksResponse {
  data: StockListItem[];
  meta: {
    count: number;
    source: string;
  };
}

interface StockDetailResponse {
  data: {
    profile: EvaluationInput["profile"];
    price: EvaluationInput["price"];
    financials: EvaluationInput["financials"];
    news: EvaluationInput["news"];
    evaluation: EvaluationResult;
  };
  meta: {
    source: string;
  };
}

const fallbackStocks: StockListItem[] = mockEvaluationInputs.map(toStockListItem);

function App() {
  const [stocks, setStocks] = useState<StockListItem[]>(fallbackStocks);
  const [selectedSymbol, setSelectedSymbol] = useState(fallbackStocks[0]?.symbol ?? "");
  const [stockDetail, setStockDetail] = useState<StockDetail | null>(() => buildMockDetail(fallbackStocks[0]?.symbol));
  const [source, setSource] = useState("local-mock");
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadStocks() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/stocks");

        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }

        const body = (await response.json()) as StocksResponse;

        if (!active) return;

        setStocks(body.data);
        setSource(body.meta.source);
        setSelectedSymbol((current) => current || body.data[0]?.symbol || "");
      } catch (caught) {
        if (!active) return;

        setStocks(fallbackStocks);
        setSource("local-mock");
        setError(caught instanceof Error ? caught.message : "Unable to load API data");
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadStocks();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedSymbol) return;

    let active = true;

    async function loadDetail() {
      setIsDetailLoading(true);
      setDetailError(null);

      try {
        const response = await fetch(`/api/stocks/${encodeURIComponent(selectedSymbol)}`);

        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }

        const body = (await response.json()) as StockDetailResponse;

        if (!active) return;

        setStockDetail({
          input: {
            profile: body.data.profile,
            price: body.data.price,
            financials: body.data.financials,
            news: body.data.news,
            dataQuality: body.data.evaluation.dataQuality,
          },
          evaluation: body.data.evaluation,
          source: body.meta.source,
        });
      } catch (caught) {
        if (!active) return;

        setStockDetail(buildMockDetail(selectedSymbol));
        setDetailError(caught instanceof Error ? caught.message : "Unable to load stock detail");
      } finally {
        if (active) {
          setIsDetailLoading(false);
        }
      }
    }

    void loadDetail();

    return () => {
      active = false;
    };
  }, [selectedSymbol]);

  const displayStocks = useMemo(
    () =>
      stocks.map((stock) =>
        stockDetail?.input.profile.symbol === stock.symbol
          ? {
              ...stock,
              price: stockDetail.input.price.price,
              currency: stockDetail.input.price.currency,
              priceUnit: stockDetail.input.price.priceUnit,
              changePercent: stockDetail.input.price.changePercent ?? null,
              status: stockDetail.evaluation.status,
              bias: stockDetail.evaluation.bias,
              confidence: stockDetail.evaluation.confidence,
              score: stockDetail.evaluation.score,
              topReason: stockDetail.evaluation.topReason,
              fairValue: stockDetail.evaluation.fairValue,
              dataQuality: stockDetail.evaluation.dataQuality,
              evaluatedAt: stockDetail.evaluation.evaluatedAt,
            }
          : stock,
      ),
    [stockDetail, stocks],
  );

  const selectedStock = useMemo(
    () => displayStocks.find((stock) => stock.symbol === selectedSymbol) ?? displayStocks[0],
    [selectedSymbol, displayStocks],
  );

  return (
    <main className="app-shell">
      <section className="topbar">
        <div>
          <p className="eyebrow">V1 dashboard</p>
          <h1>Stock Signal Desk</h1>
        </div>
        <div className="topbar-actions">
          <div className="status-pill">
            <Clock size={16} />
            {isLoading ? "Loading" : `Source: ${source}`}
          </div>
          <button className="icon-button" type="button" title="Refresh" onClick={() => window.location.reload()}>
            <RefreshCw size={17} />
          </button>
        </div>
      </section>

      {error ? (
        <section className="notice" role="status">
          API unavailable here, showing local mock evaluations.
        </section>
      ) : null}

      <section className="dashboard-grid">
        <article className="stock-panel watchlist-panel">
          <div className="panel-title">
            <TrendingUp size={20} />
            <h2>Watchlist</h2>
          </div>

          <div className="stock-list">
            {displayStocks.map((stock) => (
              <button
                className={`stock-row ${stock.symbol === selectedStock?.symbol ? "selected" : ""}`}
                key={stock.symbol}
                type="button"
                onClick={() => setSelectedSymbol(stock.symbol)}
              >
                <span>
                  <strong>{stock.symbol}</strong>
                  <small>{stock.companyName}</small>
                </span>
                <span className="row-metrics">
                  <strong>{formatPrice(stock)}</strong>
                  <small className={stock.changePercent != null && stock.changePercent < 0 ? "negative-text" : "positive-text"}>
                    {formatPercent(stock.changePercent)}
                  </small>
                </span>
                <span className={`rating ${statusClass(stock.status)}`}>{formatStatus(stock.status)}</span>
              </button>
            ))}
          </div>
        </article>

        {selectedStock && stockDetail ? (
          <StockDetailView
            detail={stockDetail}
            fallbackStock={selectedStock}
            isLoading={isDetailLoading}
            hasFallback={Boolean(detailError)}
          />
        ) : null}
      </section>

      <footer>
        <AlertTriangle size={16} />
        Decision support only. No order placement in V1.
      </footer>
    </main>
  );
}

function StockDetailView({
  detail,
  fallbackStock,
  isLoading,
  hasFallback,
}: {
  detail: StockDetail;
  fallbackStock: StockListItem;
  isLoading: boolean;
  hasFallback: boolean;
}) {
  const { input, evaluation } = detail;
  const latestFinancials = useMemo(() => findLatestFinancials(input.financials), [input.financials]);
  const displayStock = {
    ...fallbackStock,
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

  return (
    <>
      <article className="stock-panel feature-panel">
        <div className="stock-heading">
          <div>
            <p className="eyebrow">
              {input.profile.displaySymbol} · {input.profile.region} · {detail.source}
            </p>
            <h2>{input.profile.companyName}</h2>
          </div>
          <span className={`rating ${statusClass(evaluation.status)}`}>{formatStatus(evaluation.status)}</span>
        </div>

        <div className="price-row">
          <span className="price">{formatPrice(displayStock)}</span>
          <span className={`move ${input.price.changePercent != null && input.price.changePercent < 0 ? "negative" : "positive"}`}>
            {formatPercent(input.price.changePercent)}
          </span>
        </div>

        <p className="summary">{evaluation.topReason}</p>

        <div className="score-strip">
          <MetricTile label="Total Score" value={`${evaluation.score}/100`} />
          <MetricTile label="Expected Return" value={formatPercent(evaluation.expectedReturnPercent)} />
          <MetricTile label="Outperformance" value={formatPercent(evaluation.probabilityOfOutperformance)} />
          <MetricTile label="Confidence" value={formatConfidence(evaluation.confidence)} />
        </div>

        {isLoading || hasFallback ? (
          <div className="detail-note" role="status">
            {isLoading ? "Refreshing stock detail..." : "Live detail unavailable here, using local algorithm snapshot."}
          </div>
        ) : null}
      </article>

      <article className="stock-panel detail-panel">
        <div className="panel-title">
          <Target size={20} />
          <h2>Price Zones</h2>
        </div>
        <div className="range-bar" aria-label={`${input.profile.symbol} price zones`}>
          <span className="cheap">Insane Cheap</span>
          <span className="buy">Buy</span>
          <span className="hold-zone">Hold</span>
          <span className="sell">Sell</span>
          <span className="hard-sell">Hard Sell</span>
        </div>
        <div className="zone-table">
          {priceZoneRows(evaluation.priceZones).map((row) => (
            <div key={row.label}>
              <span>{row.label}</span>
              <strong>{formatZone(row.range, evaluation.priceZones)}</strong>
            </div>
          ))}
        </div>
      </article>

      <article className="stock-panel factor-panel">
        <div className="panel-title">
          <BarChart3 size={20} />
          <h2>Algorithm Factors</h2>
        </div>
        {evaluation.factorScores.map((factor) => (
          <div className="factor-detail-row" key={factor.name}>
            <div>
              <span>{formatFactorName(factor.name)}</span>
              <small>{factor.explanation}</small>
            </div>
            <div className="factor-track" aria-label={`${factor.name} score ${factor.score}`}>
              <div style={{ width: `${factor.score}%` }} />
            </div>
            <strong>{factor.score}</strong>
          </div>
        ))}
      </article>

      <article className="stock-panel detail-panel">
        <div className="panel-title">
          <FileText size={20} />
          <h2>Fundamental Snapshot</h2>
        </div>
        <div className="metric-grid">
          <MetricTile label="Revenue Growth" value={formatRevenueGrowth(input.financials)} />
          <MetricTile label="P/E" value={formatRatio(latestFinancials?.ratios.pe, "x")} />
          <MetricTile label="P/S" value={formatRatio(latestFinancials?.ratios.ps, "x")} />
          <MetricTile label="FCF Yield" value={formatPercentRatio(latestFinancials?.ratios.fcfYield)} />
          <MetricTile label="Gross Margin" value={formatPercentRatio(latestFinancials?.ratios.grossMargin)} />
          <MetricTile label="EBIT Margin" value={formatPercentRatio(latestFinancials?.ratios.ebitMargin)} />
          <MetricTile label="ROE" value={formatPercentRatio(latestFinancials?.ratios.roe)} />
          <MetricTile label="ROIC" value={formatPercentRatio(latestFinancials?.ratios.roic)} />
        </div>
      </article>

      <article className="stock-panel detail-panel">
        <div className="panel-title">
          <ShieldAlert size={20} />
          <h2>Risk Flags</h2>
        </div>
        <ul className="decision-list">
          {evaluation.riskFlags.length > 0 ? (
            evaluation.riskFlags.map((risk) => <li key={risk}>{risk}</li>)
          ) : (
            <li>No major risk flags in this snapshot.</li>
          )}
        </ul>
      </article>

      <article className="stock-panel detail-panel">
        <div className="panel-title">
          <CheckCircle2 size={20} />
          <h2>What Changes Rating</h2>
        </div>
        <ul className="decision-list">
          {evaluation.whatWouldChangeRating.map((condition) => (
            <li key={condition}>{condition}</li>
          ))}
        </ul>
      </article>

      <article className="stock-panel detail-panel">
        <div className="panel-title">
          <Newspaper size={20} />
          <h2>News Signals</h2>
        </div>
        <div className="news-list">
          {input.news.length > 0 ? (
            input.news.map((item) => (
              <a href={item.url} key={item.id} rel="noreferrer" target="_blank">
                <span className={`impact ${item.impact}`}>{item.impact}</span>
                <strong>{item.headline}</strong>
                <small>
                  {item.sourceName} · {formatDateTime(item.publishedAt)}
                </small>
              </a>
            ))
          ) : (
            <p className="summary">No stock-specific news in this snapshot.</p>
          )}
        </div>
      </article>

      <article className="stock-panel detail-panel">
        <div className="panel-title">
          <Activity size={20} />
          <h2>Data Quality</h2>
        </div>
        <div className="quality-meter">
          <div style={{ width: `${evaluation.dataQuality.completeness}%` }} />
        </div>
        <div className="score-strip compact">
          <MetricTile label="Completeness" value={`${evaluation.dataQuality.completeness}%`} />
          <MetricTile label="Confidence" value={formatConfidence(evaluation.dataQuality.confidence)} />
          <MetricTile label="Updated" value={formatDateTime(evaluation.evaluatedAt)} />
        </div>
        <ul className="decision-list">
          {evaluation.dataQuality.issues.length > 0 ? (
            evaluation.dataQuality.issues.map((issue) => <li key={issue.code}>{issue.message}</li>)
          ) : (
            <li>No major data-quality issues in this snapshot.</li>
          )}
        </ul>
      </article>
    </>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-tile">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function toStockListItem(input: EvaluationInput): StockListItem {
  const evaluation = evaluateStock(input);

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

function buildMockDetail(symbol?: string): StockDetail | null {
  const input = symbol ? findMockEvaluationInput(symbol) : mockEvaluationInputs[0];

  if (!input) {
    return null;
  }

  return {
    input,
    evaluation: evaluateStock(input),
    source: "local-mock",
  };
}

function formatStatus(status: RatingStatus) {
  return status
    .split("_")
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

function statusClass(status: RatingStatus) {
  if (status === "buy" || status === "insane_cheap") return "buy-rating";
  if (status === "sell" || status === "hard_sell") return "sell-rating";
  if (status === "unrated") return "unrated-rating";
  return "hold";
}

function formatPrice(stock: Pick<StockListItem, "currency" | "price" | "priceUnit">) {
  const amount = stock.priceUnit === "minor" ? stock.price / 100 : stock.price;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: stock.currency,
    maximumFractionDigits: amount >= 100 ? 0 : 2,
  }).format(amount);
}

function formatZone(range: PriceRange, zones: PriceZones) {
  const low = range.min == null ? "Below" : formatPrice({ currency: zones.currency, price: range.min, priceUnit: zones.priceUnit });
  const high = range.max == null ? "Above" : formatPrice({ currency: zones.currency, price: range.max, priceUnit: zones.priceUnit });

  if (range.min == null) return `${low} ${high}`;
  if (range.max == null) return `${high} ${low}`;
  return `${low} to ${high}`;
}

function priceZoneRows(zones: PriceZones) {
  return [
    { label: "Insane Cheap", range: zones.insaneCheap },
    { label: "Buy", range: zones.buy },
    { label: "Hold", range: zones.hold },
    { label: "Sell", range: zones.sell },
    { label: "Hard Sell", range: zones.hardSell },
  ];
}

function formatPercent(value?: number | null) {
  if (value == null) return "n/a";
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function formatPercentRatio(value?: number | null) {
  if (value == null) return "n/a";
  return `${(value * 100).toFixed(1)}%`;
}

function formatRatio(value?: number | null, suffix = "") {
  if (value == null) return "n/a";
  return `${value.toFixed(1)}${suffix}`;
}

function formatConfidence(confidence: ConfidenceLevel) {
  return confidence
    .split("_")
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatFactorName(name: FactorName) {
  return name.slice(0, 1).toUpperCase() + name.slice(1);
}

function formatRevenueGrowth(financials: FinancialSnapshot[]) {
  const sorted = financials
    .filter((snapshot) => snapshot.revenue != null)
    .sort((a, b) => b.fiscalDate.localeCompare(a.fiscalDate));

  if (sorted.length < 2 || !sorted[0].revenue || !sorted[1].revenue) {
    return "n/a";
  }

  return formatPercentRatio((sorted[0].revenue - sorted[1].revenue) / sorted[1].revenue);
}

function findLatestFinancials(financials: FinancialSnapshot[]) {
  return [...financials].sort((a, b) => b.fiscalDate.localeCompare(a.fiscalDate))[0] ?? null;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
