# Deployment

## Target

- GitHub repository
- Cloudflare Pages project
- Neon Postgres database
- Environment variables stored in Cloudflare

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

