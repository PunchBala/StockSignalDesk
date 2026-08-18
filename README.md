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
- Finnhub as fallback or secondary provider

## Scripts

```bash
npm run dev
npm run build
npm run typecheck
npm run test
```

## Current Status

This first commit establishes the architecture, documentation and deployment baseline. The next step is the data-provider spike for a small test watchlist.

## Disclaimer

This app is for personal research and decision support only. It does not provide financial advice and does not place trades in V1.

