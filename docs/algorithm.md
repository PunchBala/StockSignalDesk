# Algorithm

## Model

The V1 algorithm is an explainable multi-factor model with business-type adjustments.

```text
FactorScore = 0.35 Value + 0.25 Quality + 0.15 Growth + 0.15 Revisions + 0.10 Momentum
```

Safety, news impact and confidence then adjust the final status.

## Factors

- Value: fair value, FCF yield, earnings yield, peer/historical valuation.
- Quality: ROIC, margins, cash conversion, balance-sheet strength, durability.
- Growth: revenue, EPS, FCF per share growth and consistency.
- Revisions: estimate changes, earnings surprises and guidance.
- Momentum: 12-1 month strength, 6-1 month strength and trend.
- Safety: leverage, dilution, cash burn, accounting risk and business fragility.
- NewsImpact: directional impact from verified recent headlines.

## Output

Each evaluation returns:

- status
- bias
- confidence
- composite score
- factor scores
- fair-value range
- buy/sell zones
- risk flags
- explanation
- conditions that would change the rating

The algorithm consumes `EvaluationInput` and returns `EvaluationResult`. It should not consume raw provider responses directly.

## V1 Implementation

`evaluateStock(input)` is deterministic and provider-agnostic. It validates `EvaluationInput`, scores value, quality, growth, revisions, momentum, safety and news, then returns an `EvaluationResult`.

V1 intentionally uses conservative fallbacks:

- missing fundamentals reduce value, quality, growth and safety
- UK quote-only inputs are allowed but can become `unrated`
- negative news and critical data-quality issues can downgrade ratings
- positive news can help only slightly
- high price-to-sales and negative free cash flow add risk flags

## Confidence

Missing data lowers confidence. Low confidence can downgrade a rating. High confidence cannot rescue poor fundamentals.
