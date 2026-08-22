import { existsSync, readFileSync } from "node:fs";

const DEFAULT_SYMBOLS = ["GOOGL", "MU", "APP", "RKLB", "RR.L"];

const providerChecks = [
  {
    provider: "fmp",
    envKey: "FMP_API_KEY",
    capabilities: [
      { key: "quote", url: (symbol, key) => fmpUrl("quote", { symbol, apikey: key }) },
      { key: "profile", url: (symbol, key) => fmpUrl("profile", { symbol, apikey: key }) },
      {
        key: "incomeStatement",
        url: (symbol, key) => fmpUrl("income-statement", { symbol, period: "annual", limit: "3", apikey: key }),
      },
      {
        key: "balanceSheet",
        url: (symbol, key) =>
          fmpUrl("balance-sheet-statement", { symbol, period: "annual", limit: "3", apikey: key }),
      },
      {
        key: "cashFlow",
        url: (symbol, key) =>
          fmpUrl("cash-flow-statement", { symbol, period: "annual", limit: "3", apikey: key }),
      },
      {
        key: "ratios",
        url: (symbol, key) => fmpUrl("ratios", { symbol, period: "annual", limit: "3", apikey: key }),
      },
    ],
  },
  {
    provider: "finnhub",
    envKey: "FINNHUB_API_KEY",
    capabilities: [
      { key: "quote", url: (symbol, key) => finnhubUrl("quote", { symbol, token: key }) },
      { key: "profile", url: (symbol, key) => finnhubUrl("stock/profile2", { symbol, token: key }) },
      { key: "metrics", url: (symbol, key) => finnhubUrl("stock/metric", { symbol, metric: "all", token: key }) },
      {
        key: "news",
        url: (symbol, key) =>
          finnhubUrl("company-news", {
            symbol,
            from: dateDaysAgo(7),
            to: dateDaysAgo(0),
            token: key,
          }),
      },
    ],
  },
];

export function parseArgs(argv) {
  const args = new Map();

  for (const arg of argv) {
    const [key, value] = arg.split("=");
    args.set(key, value ?? true);
  }

  const symbols = String(args.get("--symbols") ?? DEFAULT_SYMBOLS.join(","))
    .split(",")
    .map((symbol) => symbol.trim())
    .filter(Boolean);

  return {
    dryRun: args.has("--dry-run"),
    symbols,
  };
}

export function parseEnvText(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .reduce((env, line) => {
      const separatorIndex = line.indexOf("=");

      if (separatorIndex === -1) {
        return env;
      }

      const key = line.slice(0, separatorIndex).trim();
      const rawValue = line.slice(separatorIndex + 1).trim();
      const value = rawValue.replace(/^["']|["']$/g, "");

      if (key) {
        env[key] = value;
      }

      return env;
    }, {});
}

export function loadEnvFile(filePath = ".env") {
  if (!existsSync(filePath)) {
    return {};
  }

  return parseEnvText(readFileSync(filePath, "utf8"));
}

export function buildSpikePlan(env, symbols = DEFAULT_SYMBOLS) {
  return providerChecks.map((provider) => {
    const configured = Boolean(env[provider.envKey]);

    return {
      provider: provider.provider,
      envKey: provider.envKey,
      configured,
      symbols: symbols.map((symbol) => ({
        symbol,
        checks: provider.capabilities.map((capability) => ({
          capability: capability.key,
          status: configured ? "pending" : "skipped",
        })),
      })),
    };
  });
}

export function summarizeJsonPayload(payload) {
  const rows = Array.isArray(payload) ? payload : [payload];
  const first = rows.find((row) => row && typeof row === "object");

  return {
    hasData: rows.length > 0 && Boolean(first),
    rowCount: rows.length,
    sampleKeys: first ? Object.keys(first).slice(0, 12) : [],
  };
}

export async function runSpike({ env = process.env, symbols = DEFAULT_SYMBOLS, dryRun = false, fetcher = fetch } = {}) {
  const providerPlans = buildSpikePlan(env, symbols);
  const results = [];

  for (const provider of providerChecks) {
    const apiKey = env[provider.envKey];

    for (const symbol of symbols) {
      for (const capability of provider.capabilities) {
        if (!apiKey || dryRun) {
          results.push({
            provider: provider.provider,
            symbol,
            capability: capability.key,
            status: apiKey && dryRun ? "planned" : "skipped",
            reason: apiKey && dryRun ? "dry run" : `missing ${provider.envKey}`,
          });
          continue;
        }

        const startedAt = performance.now();
        const response = await fetcher(capability.url(symbol, apiKey));
        const durationMs = Math.round(performance.now() - startedAt);
        const payload = await response.json().catch(() => null);

        results.push({
          provider: provider.provider,
          symbol,
          capability: capability.key,
          status: response.ok ? "ok" : "failed",
          httpStatus: response.status,
          durationMs,
          ...summarizeJsonPayload(payload),
        });
      }
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    symbols,
    providerPlans,
    results,
  };
}

function fmpUrl(path, params) {
  return buildUrl(`https://financialmodelingprep.com/stable/${path}`, params);
}

function finnhubUrl(path, params) {
  return buildUrl(`https://finnhub.io/api/v1/${path}`, params);
}

function buildUrl(base, params) {
  const url = new URL(base);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return url.toString();
}

function dateDaysAgo(daysAgo) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

const currentScript = process.argv[1] ? new URL(`file://${process.argv[1].replaceAll("\\", "/")}`).href : "";

if (import.meta.url === currentScript) {
  const options = parseArgs(process.argv.slice(2));
  const report = await runSpike({
    ...options,
    env: {
      ...loadEnvFile(),
      ...process.env,
    },
  });

  console.log(JSON.stringify(report, null, 2));
}
