import { describe, expect, it } from "vitest";
import { sampleRocketLabEvaluation } from "./sampleEvaluation";

describe("sample Rocket Lab evaluation", () => {
  it("keeps price zones ordered from cheap to sell", () => {
    const zones = sampleRocketLabEvaluation.zones;

    expect(zones.insaneCheapBelow).toBe(zones.buy[0]);
    expect(zones.buy[1]).toBe(zones.hold[0]);
    expect(zones.hold[1]).toBe(zones.sell[0]);
  });

  it("keeps factor scores within the dashboard range", () => {
    expect(sampleRocketLabEvaluation.factors.every((factor) => factor.score >= 0 && factor.score <= 100)).toBe(
      true,
    );
  });
});
