export const sampleRocketLabEvaluation = {
  symbol: "RKLB",
  companyName: "Rocket Lab",
  status: "Hold",
  confidence: "Medium-Low",
  score: 53,
  zones: {
    insaneCheapBelow: 25,
    buy: [25, 45],
    hold: [45, 80],
    sell: [80, 110],
  },
  factors: [
    { label: "Value", score: 22 },
    { label: "Quality", score: 48 },
    { label: "Growth", score: 86 },
    { label: "Momentum", score: 70 },
    { label: "Safety", score: 38 },
  ],
} as const;

