import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Activity, AlertTriangle, BarChart3, Clock, RefreshCw, TrendingUp } from "lucide-react";
import { evaluateStock } from "./domain/evaluateStock";
import { mockEvaluationInputs } from "./domain/mockStockInputs";
import type { ConfidenceLevel, RatingStatus } from "./domain/stockTypes";
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
  fairValue: {
    min?: number | null;
    max?: number | null;
  };
  dataQuality: {
    completeness: number;
    issues: Array<{ message: string }>;
  };
  evaluatedAt: string;
}

interface StocksResponse {
  data: StockListItem[];
  meta: {
    count: number;
    source: string;
  };
}

const fallbackStocks: StockListItem[] = mockEvaluationInputs.map((input) => {
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
});

function App() {
  const [stocks, setStocks] = useState<StockListItem[]>(fallbackStocks);
  const [selectedSymbol, setSelectedSymbol] = useState(fallbackStocks[0]?.symbol ?? "");
  const [source, setSource] = useState("local-mock");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const selectedStock = useMemo(
    () => stocks.find((stock) => stock.symbol === selectedSymbol) ?? stocks[0],
    [selectedSymbol, stocks],
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
            {stocks.map((stock) => (
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

        {selectedStock ? <StockSummary stock={selectedStock} /> : null}
      </section>

      <footer>
        <AlertTriangle size={16} />
        Decision support only. No order placement in V1.
      </footer>
    </main>
  );
}

function StockSummary({ stock }: { stock: StockListItem }) {
  const factors = useMemo(() => {
    const input = mockEvaluationInputs.find((item) => item.profile.symbol === stock.symbol);
    return input ? evaluateStock(input).factorScores : [];
  }, [stock.symbol]);

  return (
    <>
      <article className="stock-panel feature-panel">
        <div className="stock-heading">
          <div>
            <p className="eyebrow">
              {stock.symbol} · {stock.region}
            </p>
            <h2>{stock.companyName}</h2>
          </div>
          <span className={`rating ${statusClass(stock.status)}`}>{formatStatus(stock.status)}</span>
        </div>

        <div className="price-row">
          <span className="price">{formatPrice(stock)}</span>
          <span className={`move ${stock.changePercent != null && stock.changePercent < 0 ? "negative" : "positive"}`}>
            {formatPercent(stock.changePercent)}
          </span>
        </div>

        <p className="summary">{stock.topReason}</p>

        <div className="range-bar" aria-label={`${stock.symbol} price zones`}>
          <span className="cheap">Cheap</span>
          <span className="buy">Buy</span>
          <span className="hold-zone">Hold</span>
          <span className="sell">Sell</span>
        </div>

        <div className="zone-grid">
          <div>
            <span>Fair Value Low</span>
            <strong>{formatRangeValue(stock, stock.fairValue.min)}</strong>
          </div>
          <div>
            <span>Fair Value High</span>
            <strong>{formatRangeValue(stock, stock.fairValue.max)}</strong>
          </div>
          <div>
            <span>Confidence</span>
            <strong>{formatConfidence(stock.confidence)}</strong>
          </div>
        </div>
      </article>

      <article className="stock-panel factor-panel">
        <div className="panel-title">
          <BarChart3 size={20} />
          <h2>Factor Scores</h2>
        </div>
        {factors.map((factor) => (
          <div className="factor-row" key={factor.name}>
            <span>{formatFactorName(factor.name)}</span>
            <div className="factor-track">
              <div style={{ width: `${factor.score}%` }} />
            </div>
            <strong>{factor.score}</strong>
          </div>
        ))}
      </article>

      <article className="stock-panel">
        <div className="panel-title">
          <Activity size={20} />
          <h2>Data Quality</h2>
        </div>
        <div className="quality-meter">
          <div style={{ width: `${stock.dataQuality.completeness}%` }} />
        </div>
        <ul className="decision-list">
          {stock.dataQuality.issues.length > 0 ? (
            stock.dataQuality.issues.map((issue) => <li key={issue.message}>{issue.message}</li>)
          ) : (
            <li>No major data-quality issues in this mock snapshot.</li>
          )}
        </ul>
      </article>
    </>
  );
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

function formatPrice(stock: StockListItem) {
  const amount = stock.priceUnit === "minor" ? stock.price / 100 : stock.price;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: stock.currency,
    maximumFractionDigits: amount >= 100 ? 0 : 2,
  }).format(amount);
}

function formatRangeValue(stock: StockListItem, value?: number | null) {
  if (value == null) return "n/a";
  return formatPrice({ ...stock, price: value });
}

function formatPercent(value?: number | null) {
  if (value == null) return "n/a";
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function formatConfidence(confidence: ConfidenceLevel) {
  return confidence
    .split("_")
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatFactorName(name: string) {
  return name.slice(0, 1).toUpperCase() + name.slice(1);
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
