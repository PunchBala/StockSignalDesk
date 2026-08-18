interface Env {
  FMP_API_KEY?: string;
  FINNHUB_API_KEY?: string;
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

  if (url.pathname === "/api/health") {
    return json({
      ok: true,
      service: "stock-evaluator",
      providersConfigured: {
        fmp: Boolean(env.FMP_API_KEY),
        finnhub: Boolean(env.FINNHUB_API_KEY),
        database: Boolean(env.DATABASE_URL),
      },
    });
  }

  return json(
    {
      error: "Not found",
      availableRoutes: ["/api/health"],
    },
    { status: 404 },
  );
};

