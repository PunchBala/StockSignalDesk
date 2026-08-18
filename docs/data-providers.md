# Data Providers

## Primary Candidate

Financial Modeling Prep is the first candidate because its free tier is useful for a small personal watchlist and includes basic stock and financial data.

## Secondary Candidate

Finnhub is a fallback or secondary source for quotes, company news and some profile data.

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

