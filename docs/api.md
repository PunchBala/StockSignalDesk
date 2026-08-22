# API

Initial API shape:

```text
GET /api/health
GET /api/stocks
GET /api/stocks/:symbol
POST /api/watchlist
DELETE /api/watchlist/:symbol
POST /api/refresh/:symbol
GET /api/evaluations/:symbol
GET /api/news/:symbol
```

Implemented routes:

- `GET /api/health`
- `GET /api/stocks`
- `GET /api/stocks/:symbol`

The stock routes now attempt live server-side provider data when provider keys are configured. If no provider key is available, or if the provider returns unusable data, the routes fall back to mock snapshots evaluated by the real V1 algorithm engine.

Live provider behavior:

- US symbols: Finnhub quote, profile, metrics and news.
- UK symbols: Alpha Vantage quote-only attempt.
- Fallback: local mock data, with source metadata showing `mock` or `live+mock-fallback`.

## Response Contracts

API responses should use the shared domain contracts from `src/domain/stockTypes.ts`. Provider-specific response shapes stay inside provider adapters and should not leak into frontend or algorithm code.

## Secret Handling

Provider keys must be configured only in server-side environments:

- Local `.env` for scripts and tests.
- Cloudflare Pages Function environment variables for hosted API routes.

Do not expose provider keys through Vite `VITE_*` variables or frontend code.
