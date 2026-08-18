# Deployment

## Target

- GitHub repository
- Cloudflare Pages project
- Neon Postgres database
- Environment variables stored in Cloudflare

## GitHub Pages Preview

GitHub Pages can deploy the static frontend preview from `main`.

Expected URL:

```text
https://punchbala.github.io/StockSignalDesk/
```

This preview does not run Cloudflare Pages Functions, scheduled jobs or backend API routes. Use Cloudflare for the full-stack V1 deployment.

## Required Secrets

- `FMP_API_KEY`
- `FINNHUB_API_KEY`
- `DATABASE_URL`

## Build

```bash
npm run build
```

Cloudflare Pages build output:

```text
dist
```
