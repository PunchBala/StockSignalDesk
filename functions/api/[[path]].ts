import { getStockDetail, getStockList } from "../../src/server/providerData";

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
    if (!shouldUseLiveData(env)) {
      return json(
        {
          error: "Live providers are not configured",
          requiredProviders: ["FINNHUB_API_KEY", "ALPHA_VANTAGE_API_KEY"],
        },
        { status: 503 },
      );
    }

    const { stocks, source } = await getStockList(env);

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

    if (!detail) {
      return json(
        {
          error: shouldUseLiveData(env) ? "Live stock data unavailable" : "Live providers are not configured",
          symbol,
        },
        { status: shouldUseLiveData(env) ? 404 : 503 },
      );
    }

    return json({
      data: {
        profile: detail.input.profile,
        price: detail.input.price,
        financials: detail.input.financials,
        news: detail.input.news,
        evaluation: detail.evaluation,
      },
      meta: {
        source: detail.source,
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
