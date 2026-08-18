# Data Providers

## Primary Candidate

Financial Modeling Prep is the first candidate because its free tier is useful for a small personal watchlist and includes basic stock and financial data.

V1 spike checks:

- `quote`
- `profile`
- `income-statement`
- `balance-sheet-statement`
- `cash-flow-statement`
- `ratios`

Reference: https://site.financialmodelingprep.com/developer/docs/quickstart

## Secondary Candidate

Finnhub is a fallback or secondary source for quotes, company news and some profile data.

V1 spike checks:

- `quote`
- `stock/profile2`
- `stock/metric`
- `company-news`

Reference: https://www.finnhub.io/docs/api

## Provider Rules

- Cache provider responses.
- Respect rate limits.
- Store raw response metadata for debugging.
- Normalize all providers into internal snapshots before evaluation.
- Never expose API keys to the frontend.

## V1 Spike Symbols

- GOOGL
- MU
- APP
- RKLB
- One UK stock, such as RR.L or SHEL.L

## Spike Command

Run a dry plan without API keys:

```bash
pnpm run spike:providers -- --dry-run
```

Run real checks after adding local environment variables:

```bash
FMP_API_KEY=... FINNHUB_API_KEY=... pnpm run spike:providers
```

The spike output records endpoint availability, HTTP status, response time, row count and sample keys. It intentionally avoids storing full provider responses in the repository.

## Step 2 Exit Criteria

- Script runs without API keys and reports skipped checks clearly.
- Script can run against real provider keys from local environment variables.
- Tests cover default symbols, missing keys, dry-run mode and response-shape summarization.
- Results decide which provider becomes the first real adapter.
