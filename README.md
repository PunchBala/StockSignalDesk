# Stock Evaluator

A private V1 stock-evaluation web app for US and UK watchlists.

The app is designed as a decision-support cockpit. It evaluates selected stocks using an explainable algorithm, shows rating zones, summarizes news, and keeps the architecture ready for future portfolio sync and multi-user accounts.

## V1 Stack

- GitHub for source control
- GitHub Actions for CI
- Cloudflare Pages for frontend deployment
- Cloudflare Pages Functions and Cron Triggers for API and scheduled refreshes
- Neon Postgres for hosted database
- React, Vite and TypeScript for the frontend
- Drizzle ORM and Zod for backend data access and validation
- Financial Modeling Prep as the first data provider
- Finnhub as the primary US quote, metrics and news provider

## Scripts

```bash
pnpm run dev
pnpm run build
pnpm run typecheck
pnpm run test
pnpm run spike:providers -- --dry-run
pnpm run spike:providers -- --providers=alpha-vantage --symbols=RR.LON,SHEL.LON,BARC.LON
pnpm run spike:providers -- --providers=alpha-vantage --symbols=RR.LON,SHEL.LON,BARC.LON --capabilities=globalQuote
```

The provider spike reads local `.env` values automatically. Keep API keys in `.env`, not `.env.example`.

## Current Status

The app has a V1 dashboard, stock detail view, live API routes, the first explainable algorithm engine, and a server-side provider adapter.

Current live-provider position:

- Finnhub is wired for US quote/profile/metrics/news when `FINNHUB_API_KEY` is available server-side.
- Alpha Vantage is wired as a UK quote-only attempt when `ALPHA_VANTAGE_API_KEY` is available server-side.
- Missing, blocked or rate-limited provider responses are shown as unavailable rather than replaced with mock data.
- GitHub Pages remains a static preview and cannot securely run provider keys by itself.
- Live API responses are cached for 10 minutes by default to protect free provider limits.

## GitHub Pages Preview

The static frontend can be deployed to GitHub Pages from `main`:

```text
https://punchbala.github.io/StockSignalDesk/
```

Cloudflare remains the target for the full-stack app because GitHub Pages does not run the backend API or scheduled jobs.

## Disclaimer

This app is for personal research and decision support only. It does not provide financial advice and does not place trades in V1.
