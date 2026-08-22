import { evaluateStock } from "../../src/domain/evaluateStock";
import { findMockEvaluationInput, mockEvaluationInputs } from "../../src/domain/mockStockInputs";
import { getStockDetail, getStockList, toStockListItem } from "../../src/server/providerData";

interface Env {
  FMP_API_KEY?: string;
  FINNHUB_API_KEY?: string;
  ALPHA_VANTAGE_API_KEY?: string;
  DATABASE_URL?: string;
  WATCHLIST_SYMBOLS?: string;
}

const json = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body, null, 2), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...init?.headers,
    },
  });

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, "");

  if (path === "/api/health") {
    return json({
      ok: true,
      service: "stock-evaluator",
      providersConfigured: {
        fmp: Boolean(env.FMP_API_KEY),
        finnhub: Boolean(env.FINNHUB_API_KEY),
        alphaVantage: Boolean(env.ALPHA_VANTAGE_API_KEY),
        database: Boolean(env.DATABASE_URL),
      },
    });
  }

  if (path === "/api/stocks") {
    const { stocks, source } = shouldUseLiveData(env)
      ? await getStockList(env)
      : {
          stocks: mockEvaluationInputs.map((input) => toStockListItem(input)),
          source: "mock",
        };

    return json({
      data: stocks,
      meta: {
        count: stocks.length,
        source,
      },
    });
  }

  const stockMatch = path.match(/^\/api\/stocks\/([^/]+)$/);

  if (stockMatch) {
    const symbol = decodeURIComponent(stockMatch[1]);
    const detail = shouldUseLiveData(env) ? await getStockDetail(symbol, env) : null;
    const input = detail?.input ?? findMockEvaluationInput(symbol);

    if (!input) {
      return json(
        {
          error: "Stock not found",
          symbol,
          availableSymbols: mockEvaluationInputs.map((stock) => stock.profile.symbol),
        },
        { status: 404 },
      );
    }

    return json({
      data: {
        profile: input.profile,
        price: input.price,
        financials: input.financials,
        news: input.news,
        evaluation: detail?.evaluation ?? evaluateStock(input),
      },
      meta: {
        source: detail?.source ?? "mock",
      },
    });
  }

  return json(
    {
      error: "Not found",
      availableRoutes: ["/api/health", "/api/stocks", "/api/stocks/:symbol"],
    },
    { status: 404 },
  );
};

function shouldUseLiveData(env: Env) {
  return Boolean(env.FINNHUB_API_KEY || env.ALPHA_VANTAGE_API_KEY);
}
