import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Activity, AlertTriangle, BarChart3, Clock, TrendingUp } from "lucide-react";
import { sampleRocketLabEvaluation } from "./sampleEvaluation";
import "./styles.css";

const factors = sampleRocketLabEvaluation.factors;

function App() {
  return (
    <main className="app-shell">
      <section className="topbar">
        <div>
          <p className="eyebrow">V1 foundation</p>
          <h1>Stock Evaluator</h1>
        </div>
        <div className="status-pill">
          <Clock size={16} />
          Cloudflare-ready
        </div>
      </section>

      <section className="dashboard-grid">
        <article className="stock-panel">
          <div className="stock-heading">
            <div>
              <p className="eyebrow">RKLB</p>
              <h2>Rocket Lab</h2>
            </div>
            <span className="rating hold">Hold</span>
          </div>

          <div className="price-row">
            <span className="price">$70.20</span>
            <span className="move negative">-2.4%</span>
          </div>

          <p className="summary">
            Strong growth and contract momentum, but valuation already prices in major future execution.
          </p>

          <div className="range-bar" aria-label="Rocket Lab price zones">
            <span className="cheap">Cheap</span>
            <span className="buy">Buy</span>
            <span className="hold-zone">Hold</span>
            <span className="sell">Sell</span>
          </div>

          <div className="zone-grid">
            <div>
              <span>Buy Zone</span>
              <strong>$25-$45</strong>
            </div>
            <div>
              <span>Fair Value</span>
              <strong>$45-$80</strong>
            </div>
            <div>
              <span>Sell Zone</span>
              <strong>$80-$110</strong>
            </div>
          </div>
        </article>

        <article className="stock-panel factor-panel">
          <div className="panel-title">
            <BarChart3 size={20} />
            <h2>Factor Scores</h2>
          </div>
          {factors.map((factor) => (
            <div className="factor-row" key={factor.label}>
              <span>{factor.label}</span>
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
            <h2>What Changes Rating</h2>
          </div>
          <ul className="decision-list">
            <li>Buy if price falls below $45 or Neutron execution materially improves.</li>
            <li>Sell if price moves above $80 without better fundamentals.</li>
            <li>Hard risk flag if backlog conversion slows or dilution rises sharply.</li>
          </ul>
        </article>

        <article className="stock-panel">
          <div className="panel-title">
            <AlertTriangle size={20} />
            <h2>V1 Build Priorities</h2>
          </div>
          <ul className="decision-list">
            <li>Watchlist-first evaluation for US and UK stocks.</li>
            <li>Cloudflare Pages, Workers, Cron Triggers and Neon Postgres.</li>
            <li>Documented algorithm with explainable output before scaling.</li>
          </ul>
        </article>
      </section>

      <footer>
        <TrendingUp size={16} />
        Decision support only. No order placement in V1.
      </footer>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
