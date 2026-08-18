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

Only `/api/health` exists in the first scaffold.

