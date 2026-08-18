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

## Confidence

Missing data lowers confidence. Low confidence can downgrade a rating. High confidence cannot rescue poor fundamentals.

