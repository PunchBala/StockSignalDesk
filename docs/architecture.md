# Architecture

## Overview

```text
React/Vite frontend
  -> Cloudflare Pages
  -> Pages Functions API
  -> Provider adapters
  -> Neon Postgres
  -> Algorithm engine
  -> Evaluation results
```

## Hosting

Cloudflare Pages hosts the static frontend. Pages Functions provide API routes and scheduled refresh handlers. GitHub remains the source of truth, and GitHub Actions validates every push and pull request.

## Backend Boundaries

The frontend never calculates ratings. It asks the backend for evaluated stock snapshots. This keeps secrets, provider calls, data normalization and rating logic server-side.

## Domain Contracts

Provider adapters normalize external responses into shared domain contracts before storage or evaluation:

- `StockProfile`
- `PriceSnapshot`
- `FinancialSnapshot`
- `NewsItem`
- `DataQuality`
- `EvaluationInput`
- `EvaluationResult`

These contracts explicitly support quote-only UK stocks. Missing fundamentals are represented as data-quality issues and lower confidence instead of causing failures.

## Provider Layer

Provider adapters normalize external data into internal snapshots:

- MarketDataProvider
- FundamentalsProvider
- NewsProvider
- PortfolioProvider, later for Trading 212

## Database

Neon Postgres is the first deployed database choice. V1 tables will cover watchlist symbols, price snapshots, financial snapshots, evaluations, news items, news summaries, settings and refresh logs.
