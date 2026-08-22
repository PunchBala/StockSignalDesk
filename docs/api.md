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

The stock routes require live server-side provider data. If no provider key is available, the API returns `503`. If a provider returns unusable data for a symbol, the detail route returns `404` and the list route omits that symbol.

Live provider behavior:

- US symbols: Finnhub quote, profile, metrics and news.
- UK symbols: Alpha Vantage quote-only attempt.
- No mock fallback in deployed API responses.

## Response Contracts

API responses should use the shared domain contracts from `src/domain/stockTypes.ts`. Provider-specific response shapes stay inside provider adapters and should not leak into frontend or algorithm code.

## Secret Handling

Provider keys must be configured only in server-side environments:

- Local `.env` for scripts and tests.
- Cloudflare Pages Function environment variables for hosted API routes.

Do not expose provider keys through Vite `VITE_*` variables or frontend code.
