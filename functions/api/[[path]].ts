import { evaluateStock } from "../../src/domain/evaluateStock";
import { findMockEvaluationInput, mockEvaluationInputs } from "../../src/domain/mockStockInputs";

interface Env {
  FMP_API_KEY?: string;
  FINNHUB_API_KEY?: string;
  ALPHA_VANTAGE_API_KEY?: string;
  DATABASE_URL?: string;
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
    const stocks = mockEvaluationInputs.map((input) => {
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

    return json({
      data: stocks,
      meta: {
        count: stocks.length,
        source: "mock",
      },
    });
  }

  const stockMatch = path.match(/^\/api\/stocks\/([^/]+)$/);

  if (stockMatch) {
    const symbol = decodeURIComponent(stockMatch[1]);
    const input = findMockEvaluationInput(symbol);

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
        evaluation: evaluateStock(input),
      },
      meta: {
        source: "mock",
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
