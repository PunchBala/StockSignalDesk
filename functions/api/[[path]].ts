import { getStockDetail, getStockList } from "../../src/server/providerData";

interface Env {
  FMP_API_KEY?: string;
  FINNHUB_API_KEY?: string;
  ALPHA_VANTAGE_API_KEY?: string;
  DATABASE_URL?: string;
  WATCHLIST_SYMBOLS?: string;
  STOCK_CACHE_TTL_SECONDS?: string;
}

const DEFAULT_CACHE_TTL_SECONDS = 600;

const json = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body, null, 2), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...init?.headers,
    },
  });

export const onRequestGet: PagesFunction<Env> = async ({ request, env, waitUntil }) => {
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
    return withApiCache(request, env, waitUntil, async () => {
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
    });
  }

  const stockMatch = path.match(/^\/api\/stocks\/([^/]+)$/);

  if (stockMatch) {
    return withApiCache(request, env, waitUntil, async () => {
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

async function withApiCache(
  request: Request,
  env: Env,
  waitUntil: (promise: Promise<unknown>) => void,
  load: () => Promise<Response>,
) {
  const cache = (globalThis.caches as (CacheStorage & { default?: Cache }) | undefined)?.default;
  const ttlSeconds = cacheTtlSeconds(env);
  const cacheRequest = new Request(cacheKeyFor(request), { method: "GET" });

  if (cache && ttlSeconds > 0) {
    const cached = await cache.match(cacheRequest);

    if (cached) {
      return responseWithCacheHeaders(cached, "HIT", ttlSeconds);
    }
  }

  const response = await load();

  if (cache && ttlSeconds > 0 && response.ok) {
    waitUntil(cache.put(cacheRequest, responseWithCacheHeaders(response.clone(), "MISS", ttlSeconds)));
  }

  return responseWithCacheHeaders(response, cache && ttlSeconds > 0 ? "MISS" : "BYPASS", response.ok ? ttlSeconds : 0);
}

function cacheKeyFor(request: Request) {
  const url = new URL(request.url);
  url.searchParams.sort();
  return url.toString();
}

function responseWithCacheHeaders(response: Response, cacheStatus: "BYPASS" | "HIT" | "MISS", ttlSeconds: number) {
  const headers = new Headers(response.headers);
  headers.set("x-stock-cache", cacheStatus);
  headers.set("cache-control", response.ok && ttlSeconds > 0 ? `public, max-age=${ttlSeconds}` : "no-store");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function cacheTtlSeconds(env: Env) {
  const configured = Number(env.STOCK_CACHE_TTL_SECONDS);

  if (Number.isFinite(configured) && configured >= 0) {
    return Math.round(configured);
  }

  return DEFAULT_CACHE_TTL_SECONDS;
}
