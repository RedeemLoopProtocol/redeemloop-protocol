#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const config = {
  apiBaseUrl: normalizeUrl(args.apiBaseUrl ?? process.env.REDEEMLOOP_API_BASE_URL ?? "http://127.0.0.1:3002"),
  merchantId: args.merchantId ?? process.env.REDEEMLOOP_MERCHANT_ID ?? process.env.REDEEMLOOP_WORKER_MERCHANT_ID ?? "merchant_cafe",
  apiKey: args.apiKey ?? process.env.REDEEMLOOP_API_KEY ?? process.env.REDEEMLOOP_WORKER_API_KEY ?? apiKeyFromMap(process.env.REDEEMLOOP_API_KEYS, args.merchantId ?? process.env.REDEEMLOOP_MERCHANT_ID ?? process.env.REDEEMLOOP_WORKER_MERCHANT_ID ?? "merchant_cafe"),
  timeoutMs: positiveInteger(args.timeoutMs ?? process.env.REDEEMLOOP_BETA_CHECK_TIMEOUT_MS ?? "8000", "timeout"),
  production: args.production,
  includeDocker: args.includeDocker,
  requireEvmRpc: args.requireEvmRpc,
  requireShopifyLive: args.requireShopifyLive,
  json: args.json,
};

const checks = [];

await checkApiHealth(config, checks);
const runtimeConfig = await checkRuntimeConfig(config, checks);
await checkWebhookDiagnostics(config, checks);
await checkEvmRpcDiagnostics(config, checks);
await checkShopifyDiagnostics(config, checks);
if (config.includeDocker) checkDockerCompose(checks);

const report = {
  checkedAt: new Date().toISOString(),
  mode: config.production ? "production" : "sandbox",
  apiBaseUrl: config.apiBaseUrl,
  merchantId: config.merchantId,
  runtime: runtimeConfig,
  checks,
  summary: summarizeChecks(checks),
};

if (config.json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  printReport(report);
}

process.exitCode = report.summary.fail > 0 ? 1 : 0;

async function checkApiHealth(input, output) {
  const response = await getJson(input, "/health", { auth: false });
  if (!response.ok) {
    output.push(check("api.health", "fail", `API health check failed: ${response.status}`, response.body));
    return;
  }
  output.push(check("api.health", response.body?.ok === true ? "pass" : "fail", "API health endpoint responded", response.body));
}

async function checkRuntimeConfig(input, output) {
  const response = await getJson(input, "/v1/config", { auth: false });
  if (!response.ok) {
    output.push(check("api.config", "fail", `Runtime config failed: ${response.status}`, response.body));
    return undefined;
  }

  const persistenceKind = response.body?.persistence?.kind;
  if (input.production && persistenceKind !== "postgres") {
    output.push(check("api.persistence", "fail", `Production beta requires postgres persistence, got ${String(persistenceKind)}`, response.body?.persistence));
  } else if (persistenceKind !== "postgres") {
    output.push(check("api.persistence", "warn", `Postgres persistence is recommended for beta, got ${String(persistenceKind)}`, response.body?.persistence));
  } else {
    output.push(check("api.persistence", "pass", "Postgres persistence is active", response.body?.persistence));
  }

  if (response.body?.auth?.apiKeysEnabled === true) {
    output.push(check("api.auth", "pass", "Merchant API keys are enabled", response.body?.auth));
  } else if (input.production) {
    output.push(check("api.auth", "fail", "Production beta requires merchant API keys", response.body?.auth));
  } else {
    output.push(check("api.auth", "warn", "Merchant API keys are disabled", response.body?.auth));
  }

  const cors = response.body?.cors ?? {};
  const embedAllowedOrigins = Array.isArray(response.body?.embedAllowedOrigins) ? response.body.embedAllowedOrigins : [];
  const wildcardAllowed = cors.wildcardAllowed === true || embedAllowedOrigins.includes("*");
  if (wildcardAllowed && input.production) {
    output.push(check("api.cors", "fail", "Production beta must not allow wildcard embed origins", cors));
  } else if (wildcardAllowed) {
    output.push(check("api.cors", "warn", "Wildcard embed origins are only acceptable for local experiments", cors));
  } else {
    output.push(check("api.cors", "pass", "Embed CORS origins are explicit", cors));
  }

  const rateLimit = response.body?.rateLimit ?? {};
  if (rateLimit.enabled === true && Number(rateLimit.max ?? 0) > 0 && Number(rateLimit.windowMs ?? 0) > 0) {
    output.push(check("api.rate_limit", "pass", "API rate limiting is enabled", rateLimit));
  } else if (input.production) {
    output.push(check("api.rate_limit", "fail", "Production beta requires API rate limiting", rateLimit));
  } else {
    output.push(check("api.rate_limit", "warn", "API rate limiting is disabled", rateLimit));
  }

  return response.body;
}

async function checkWebhookDiagnostics(input, output) {
  const path = `/v1/diagnostics/webhooks?merchantId=${encodeURIComponent(input.merchantId)}`;
  const response = await getJson(input, path, { auth: true });
  if (!response.ok) {
    output.push(check("webhooks.diagnostics", "fail", `Webhook diagnostics failed: ${response.status}`, response.body));
    return;
  }

  const deliveries = response.body?.deliveries ?? {};
  const worker = response.body?.worker ?? {};
  if (Number(deliveries.deadLetter ?? 0) > 0) {
    output.push(check("webhooks.dead_letter", "fail", "Dead-letter webhook deliveries require operator review", deliveries));
  } else {
    output.push(check("webhooks.dead_letter", "pass", "No dead-letter webhook deliveries", deliveries));
  }

  if (Number(deliveries.staleProcessing ?? 0) > 0) {
    output.push(check("webhooks.stale_processing", "fail", "Stale processing webhook deliveries require replay or worker inspection", response.body?.staleProcessing));
  } else {
    output.push(check("webhooks.stale_processing", "pass", "No stale processing webhook deliveries", deliveries));
  }

  if (worker.noRecentDrain === true) {
    output.push(check("webhooks.worker", input.production ? "fail" : "warn", "No recent webhook worker drain heartbeat", worker));
  } else {
    output.push(check("webhooks.worker", "pass", "Webhook worker drain heartbeat is recent", worker));
  }
}

async function checkEvmRpcDiagnostics(input, output) {
  const response = await getJson(input, "/v1/diagnostics/evm-rpc", { auth: false });
  if (!response.ok) {
    output.push(check("evm.rpc", input.requireEvmRpc ? "fail" : "warn", `EVM RPC diagnostics failed: ${response.status}`, response.body));
    return;
  }

  const chains = Array.isArray(response.body?.chains) ? response.body.chains : [];
  const okChains = chains.filter((chain) => chain.status === "ok");
  if (okChains.length === 0) {
    output.push(check("evm.rpc", input.requireEvmRpc ? "fail" : "warn", "No EVM RPC chain reports ok", chains));
  } else {
    output.push(check("evm.rpc", "pass", `${okChains.length} EVM RPC chain(s) report ok`, okChains.map((chain) => ({ chainId: chain.chainId, name: chain.name, rpcSource: chain.rpcSource }))));
  }
}

async function checkShopifyDiagnostics(input, output) {
  const response = await getJson(input, "/v1/diagnostics/shopify", { auth: false });
  if (!response.ok) {
    output.push(check("shopify.diagnostics", input.requireShopifyLive ? "fail" : "warn", `Shopify diagnostics failed: ${response.status}`, response.body));
    return;
  }

  const diagnostics = response.body?.diagnostics;
  if (diagnostics?.status === "ok" && diagnostics?.dryRun === false) {
    output.push(check("shopify.live", "pass", "Shopify private-app diagnostics are live", diagnostics));
  } else if (input.requireShopifyLive) {
    output.push(check("shopify.live", "fail", "Shopify live diagnostics are required but not ready", diagnostics));
  } else {
    output.push(check("shopify.live", "warn", "Shopify live diagnostics are not required for this run", diagnostics));
  }
}

function checkDockerCompose(output) {
  const result = spawnSync("docker", ["compose", "config"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status === 0) {
    output.push(check("docker.compose", "pass", "Docker Compose config is valid", undefined));
    return;
  }
  output.push(check("docker.compose", "fail", "Docker Compose config could not be verified", (result.stderr || result.stdout || result.error?.message || "").trim()));
}

async function getJson(input, path, options) {
  const headers = new Headers();
  if (options.auth && input.apiKey) headers.set("Authorization", `Bearer ${input.apiKey}`);
  try {
    const response = await fetch(new URL(path, input.apiBaseUrl), {
      headers,
      signal: AbortSignal.timeout(input.timeoutMs),
    });
    const rawBody = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      body: parseJson(rawBody),
    };
  } catch (error) {
    return {
      ok: false,
      status: "network_error",
      body: error instanceof Error ? error.message : "Request failed",
    };
  }
}

function check(name, status, message, details) {
  return { name, status, message, details };
}

function summarizeChecks(items) {
  return {
    pass: items.filter((item) => item.status === "pass").length,
    warn: items.filter((item) => item.status === "warn").length,
    fail: items.filter((item) => item.status === "fail").length,
    skip: items.filter((item) => item.status === "skip").length,
  };
}

function printReport(report) {
  console.log(`RedeemLoop beta readiness check (${report.mode})`);
  console.log(`API: ${report.apiBaseUrl}`);
  console.log(`Merchant: ${report.merchantId}`);
  console.log("");
  for (const item of report.checks) {
    console.log(`[${item.status.toUpperCase()}] ${item.name} - ${item.message}`);
  }
  console.log("");
  console.log(`Summary: ${report.summary.pass} pass, ${report.summary.warn} warn, ${report.summary.fail} fail`);
}

function parseArgs(argv) {
  const parsed = {
    production: false,
    includeDocker: false,
    requireEvmRpc: false,
    requireShopifyLive: false,
    json: false,
    help: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--") continue;
    else if (arg === "--production") parsed.production = true;
    else if (arg === "--include-docker") parsed.includeDocker = true;
    else if (arg === "--require-evm-rpc") parsed.requireEvmRpc = true;
    else if (arg === "--require-shopify-live") parsed.requireShopifyLive = true;
    else if (arg === "--json") parsed.json = true;
    else if (arg === "--help" || arg === "-h") parsed.help = true;
    else if (arg === "--api-base-url") parsed.apiBaseUrl = requireNextValue(argv, ++index, arg);
    else if (arg === "--merchant-id") parsed.merchantId = requireNextValue(argv, ++index, arg);
    else if (arg === "--api-key") parsed.apiKey = requireNextValue(argv, ++index, arg);
    else if (arg === "--timeout-ms") parsed.timeoutMs = requireNextValue(argv, ++index, arg);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return parsed;
}

function printHelp() {
  console.log(`RedeemLoop beta readiness checker

Usage:
  node scripts/beta-readiness.mjs [options]

Options:
  --production             Require production beta gates such as postgres persistence and recent worker drain.
  --include-docker         Run docker compose config as part of the check.
  --require-evm-rpc        Fail if no EVM RPC chain reports ok.
  --require-shopify-live   Fail if Shopify diagnostics are not live.
  --api-base-url URL       API base URL. Defaults to REDEEMLOOP_API_BASE_URL or http://127.0.0.1:3002.
  --merchant-id ID         Merchant ID. Defaults to REDEEMLOOP_MERCHANT_ID or merchant_cafe.
  --api-key KEY            Merchant API key. Defaults to REDEEMLOOP_API_KEY or matching REDEEMLOOP_API_KEYS entry.
  --timeout-ms NUMBER      HTTP request timeout. Defaults to 8000.
  --json                   Print JSON output.
`);
}

function requireNextValue(argv, index, flag) {
  const value = argv[index];
  if (!value) throw new Error(`${flag} requires a value`);
  return value;
}

function normalizeUrl(value) {
  return new URL(value).toString();
}

function positiveInteger(value, name) {
  const numberValue = Number(value);
  if (!Number.isSafeInteger(numberValue) || numberValue <= 0) throw new Error(`${name} must be a positive integer`);
  return numberValue;
}

function parseJson(rawBody) {
  if (!rawBody) return undefined;
  try {
    return JSON.parse(rawBody);
  } catch {
    return rawBody;
  }
}

function apiKeyFromMap(input, merchantId) {
  if (!input) return undefined;
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith("{")) {
    const parsed = JSON.parse(trimmed);
    return typeof parsed?.[merchantId] === "string" ? parsed[merchantId] : undefined;
  }
  for (const entry of trimmed.split(",")) {
    const separator = entry.indexOf(":");
    if (separator <= 0) continue;
    const key = entry.slice(0, separator).trim();
    const value = entry.slice(separator + 1).trim();
    if (key === merchantId) return value;
  }
  return undefined;
}
