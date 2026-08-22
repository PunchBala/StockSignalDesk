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

Finnhub is the primary V1 source for US quotes, company news and some profile data.

V1 spike checks:

- `quote`
- `stock/profile2`
- `stock/metric`
- `company-news`

Reference: https://www.finnhub.io/docs/api

## UK Candidate

Alpha Vantage is the first UK candidate because its docs show London Stock Exchange symbols such as `TSCO.LON`.

V1 UK spike checks:

- `GLOBAL_QUOTE`
- `TIME_SERIES_DAILY`
- `OVERVIEW`
- `INCOME_STATEMENT`
- `BALANCE_SHEET`
- `CASH_FLOW`

Reference: https://www.alphavantage.co/documentation/

## Provider Rules

- Cache provider responses.
- Respect rate limits.
- Store raw response metadata for debugging.
- Normalize all providers into internal snapshots before evaluation.
- Never expose API keys to the frontend.
- GitHub Pages is static only, so live providers must run in server-side code such as Cloudflare Pages Functions or trusted local tests.

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
FMP_API_KEY=... FINNHUB_API_KEY=... ALPHA_VANTAGE_API_KEY=... pnpm run spike:providers
```

Run a focused UK Alpha Vantage check:

```bash
pnpm run spike:providers -- --providers=alpha-vantage --symbols=RR.LON,SHEL.LON,BARC.LON
```

Run a cheaper quote-only UK Alpha Vantage check:

```bash
pnpm run spike:providers -- --providers=alpha-vantage --symbols=RR.LON,SHEL.LON,BARC.LON --capabilities=globalQuote
```

The spike output records endpoint availability, HTTP status, response time, row count and sample keys. It intentionally avoids storing full provider responses in the repository.

## Step 2 Exit Criteria

- Script runs without API keys and reports skipped checks clearly.
- Script can run against real provider keys from local environment variables.
- Tests cover default symbols, missing keys, dry-run mode and response-shape summarization.
- Results decide which provider becomes the first real adapter.

## Spike Result: 2026-08-22

FMP key was tested against `GOOGL`, `MU`, `APP`, `RKLB` and `RR.L`.

Observed result:

- `GOOGL`: quote, profile, income statement, balance sheet, cash flow and ratios returned usable data.
- `MU`, `APP`, `RKLB`: profile returned usable data, but quote and financial-statement endpoints returned `402 Payment Required`.
- `RR.L`: quote, profile and financial-statement endpoints returned `402 Payment Required`.
- Finnhub was skipped because `FINNHUB_API_KEY` was not configured yet.

Additional targeted checks against FMP `/api/v3` endpoints for `MU` and `RKLB` returned `403`, so the access issue is not only the `/stable` endpoint family.

Decision:

FMP alone is not enough for V1 on the current key. Next provider test should add Finnhub, then we should decide whether to use Finnhub as primary for quotes/news and FMP only where financial statements are available.

## Spike Result: 2026-08-22, Finnhub Added

Finnhub key was tested against the same symbols.

Observed result:

- `GOOGL`, `MU`, `APP`, `RKLB`: quote, profile, metrics and company news returned usable data.
- `RR.L`: quote, profile, metrics and news returned `403`.

Decision:

For V1, use Finnhub as the primary provider for US quotes, company profiles, metrics and news. Use FMP opportunistically for financial statements when available. UK stock support still needs another provider or a symbol/access workaround before it can be considered reliable.

## Spike Result: 2026-08-22, Alpha Vantage UK

Alpha Vantage key was tested against `RR.LON`, `SHEL.LON` and `BARC.LON`.

Observed result:

- `RR.LON`: `GLOBAL_QUOTE` returned real quote data including price.
- Follow-up Alpha Vantage calls quickly returned `Information` payloads, which indicates a provider notice/rate-limit style response rather than real stock data.

Decision:

Alpha Vantage is useful for UK quote fallback, but the free tier is too constrained for broad multi-endpoint UK fundamentals. V1 should use Alpha Vantage carefully for quote-only UK checks unless we add another UK provider.

## Step 8 Adapter Result: 2026-08-22

Implemented server-side provider adapter:

- US symbols use Finnhub for quote, profile, metrics and recent company news.
- UK symbols use Alpha Vantage `GLOBAL_QUOTE` as a quote-only attempt.
- Any missing key, provider error, rate-limit notice or blocked market is reported as unavailable. The deployed API does not return mock fallback data.
- API keys remain server-side. They are read from function environment variables, not from React.

Focused smoke check:

- `GOOGL`: Finnhub quote, profile and metrics returned usable data.
- `RR.L`: Finnhub returned `403`.
- `RR.L`: Alpha Vantage returned a provider `Information` notice during this run, so the adapter fell back safely.

Current decision:

Finnhub is the V1 live provider for US watchlist data. UK remains low-confidence until we find a free provider that reliably returns both quote and fundamentals inside the monthly budget. Mock fallback has been removed so provider gaps are visible.
