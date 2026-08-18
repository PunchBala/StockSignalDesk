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
pnpm run dev
pnpm run build
pnpm run typecheck
pnpm run test
pnpm run spike:providers -- --dry-run
```

## Current Status

This first commit establishes the architecture, documentation and deployment baseline. The next step is the data-provider spike for a small test watchlist.

## GitHub Pages Preview

The static frontend can be deployed to GitHub Pages from `main`:

```text
https://punchbala.github.io/StockSignalDesk/
```

Cloudflare remains the target for the full-stack app because GitHub Pages does not run the backend API or scheduled jobs.

## Disclaimer

This app is for personal research and decision support only. It does not provide financial advice and does not place trades in V1.
