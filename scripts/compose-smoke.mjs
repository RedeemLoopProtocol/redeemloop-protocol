#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const config = {
  composeFile: args.composeFile ?? "docker-compose.yml",
  projectName: args.projectName,
  apiBaseUrl: normalizeUrl(args.apiBaseUrl ?? process.env.REDEEMLOOP_API_BASE_URL ?? "http://127.0.0.1:3002"),
  consoleUrl: normalizeUrl(args.consoleUrl ?? process.env.REDEEMLOOP_CONSOLE_URL ?? "http://127.0.0.1:3000"),
  merchantId: args.merchantId ?? process.env.REDEEMLOOP_MERCHANT_ID ?? "merchant_cafe",
  apiKey: args.apiKey ?? process.env.REDEEMLOOP_API_KEY ?? "dev-secret",
  startupTimeoutMs: positiveInteger(args.startupTimeoutMs ?? process.env.REDEEMLOOP_COMPOSE_SMOKE_TIMEOUT_MS ?? "120000", "startup-timeout-ms"),
  requestTimeoutMs: positiveInteger(args.requestTimeoutMs ?? process.env.REDEEMLOOP_COMPOSE_SMOKE_REQUEST_TIMEOUT_MS ?? "8000", "request-timeout-ms"),
  intervalMs: positiveInteger(args.intervalMs ?? "2000", "interval-ms"),
  skipUp: args.skipUp,
  skipBuild: args.skipBuild,
  keepUp: args.keepUp,
  json: args.json,
};

const checks = [];
let startedCompose = false;

try {
  assertDockerAvailable();
  if (!config.skipUp) {
    runCompose(config, ["up", ...(config.skipBuild ? [] : ["--build"]), "-d"], { quiet: config.json });
    startedCompose = true;
  }

  await waitForCheck("api.health", checks, config.startupTimeoutMs, config.intervalMs, async () => {
    const response = await getJson(config, "/health", { auth: false });
    return response.ok && response.body?.ok === true
      ? pass("api.health", "API health endpoint is ready", response.body)
      : fail("api.health", `API health not ready: ${response.status}`, response.body);
  });

  await waitForCheck("console.http", checks, config.startupTimeoutMs, config.intervalMs, async () => {
    const response = await getText(config.consoleUrl, config.requestTimeoutMs);
    return response.ok
      ? pass("console.http", "Console HTTP endpoint is ready", { status: response.status })
      : fail("console.http", `Console HTTP endpoint not ready: ${response.status}`, response.body);
  });

  const runtime = await getJson(config, "/v1/config", { auth: false });
  checks.push(
    runtime.ok && runtime.body?.persistence?.kind === "postgres"
      ? pass("api.persistence", "Compose API is using postgres persistence", runtime.body?.persistence)
      : fail("api.persistence", `Compose API must use postgres persistence, got ${String(runtime.body?.persistence?.kind)}`, runtime.body?.persistence),
  );

  await waitForCheck("webhooks.worker", checks, config.startupTimeoutMs, config.intervalMs, async () => {
    const response = await getJson(config, `/v1/diagnostics/webhooks?merchantId=${encodeURIComponent(config.merchantId)}`, { auth: true });
    if (!response.ok) return fail("webhooks.worker", `Webhook diagnostics not ready: ${response.status}`, response.body);
    return response.body?.worker?.noRecentDrain === false
      ? pass("webhooks.worker", "Webhook worker drain heartbeat is recent", response.body?.worker)
      : fail("webhooks.worker", "Webhook worker drain heartbeat is not recent yet", response.body?.worker);
  });

  const report = {
    checkedAt: new Date().toISOString(),
    composeFile: config.composeFile,
    apiBaseUrl: config.apiBaseUrl,
    consoleUrl: config.consoleUrl,
    merchantId: config.merchantId,
    checks,
    summary: summarizeChecks(checks),
  };
  printReport(report, config.json);
  process.exitCode = report.summary.fail > 0 ? 1 : 0;
} catch (error) {
  console.error(error instanceof Error ? error.message : "Docker Compose smoke failed");
  process.exitCode = 1;
} finally {
  if (startedCompose && !config.keepUp) {
    runCompose(config, ["down"], { allowFailure: true, quiet: config.json });
  }
}

function assertDockerAvailable() {
  const result = spawnSync("docker", ["compose", "version"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    const message = (result.stderr || result.stdout || result.error?.message || "docker compose is unavailable").trim();
    throw new Error(`Docker Compose is required for this smoke test: ${message}`);
  }
}

function runCompose(config, command, options = {}) {
  const composeArgs = ["compose", "-f", config.composeFile];
  if (config.projectName) composeArgs.push("--project-name", config.projectName);
  composeArgs.push(...command);
  const result = spawnSync("docker", composeArgs, {
    encoding: "utf8",
    stdio: options.capture || options.quiet ? ["ignore", "pipe", "pipe"] : "inherit",
  });
  if (result.status !== 0 && !options.allowFailure) {
    const message = (result.stderr || result.stdout || result.error?.message || "docker compose command failed").trim();
    throw new Error(`docker ${composeArgs.join(" ")} failed: ${message}`);
  }
  if (result.status !== 0 && options.allowFailure && options.quiet) {
    const message = (result.stderr || result.stdout || result.error?.message || "").trim();
    if (message) process.stderr.write(`${message}\n`);
  }
  return result;
}

async function waitForCheck(name, checks, timeoutMs, intervalMs, run) {
  const startedAt = Date.now();
  let lastResult = fail(name, "Check did not run", undefined);
  while (Date.now() - startedAt <= timeoutMs) {
    lastResult = await run();
    if (lastResult.status === "pass") {
      checks.push(lastResult);
      return;
    }
    await sleep(intervalMs);
  }
  checks.push(lastResult);
}

async function getJson(config, path, options) {
  const headers = new Headers();
  if (options.auth) headers.set("Authorization", `Bearer ${config.apiKey}`);
  try {
    const response = await fetch(new URL(path, config.apiBaseUrl), {
      headers,
      signal: AbortSignal.timeout(config.requestTimeoutMs),
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

async function getText(url, timeoutMs) {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
    });
    return {
      ok: response.ok,
      status: response.status,
      body: await response.text().catch(() => undefined),
    };
  } catch (error) {
    return {
      ok: false,
      status: "network_error",
      body: error instanceof Error ? error.message : "Request failed",
    };
  }
}

function pass(name, message, details) {
  return { name, status: "pass", message, details };
}

function fail(name, message, details) {
  return { name, status: "fail", message, details };
}

function summarizeChecks(items) {
  return {
    pass: items.filter((item) => item.status === "pass").length,
    fail: items.filter((item) => item.status === "fail").length,
  };
}

function printReport(report, json) {
  if (json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log("RedeemLoop Docker Compose smoke");
  console.log(`API: ${report.apiBaseUrl}`);
  console.log(`Console: ${report.consoleUrl}`);
  console.log(`Merchant: ${report.merchantId}`);
  console.log("");
  for (const item of report.checks) {
    console.log(`[${item.status.toUpperCase()}] ${item.name} - ${item.message}`);
  }
  console.log("");
  console.log(`Summary: ${report.summary.pass} pass, ${report.summary.fail} fail`);
}

function parseArgs(argv) {
  const parsed = {
    skipUp: false,
    skipBuild: false,
    keepUp: false,
    json: false,
    help: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--") continue;
    else if (arg === "--skip-up") parsed.skipUp = true;
    else if (arg === "--skip-build") parsed.skipBuild = true;
    else if (arg === "--keep-up") parsed.keepUp = true;
    else if (arg === "--json") parsed.json = true;
    else if (arg === "--help" || arg === "-h") parsed.help = true;
    else if (arg === "--compose-file") parsed.composeFile = requireNextValue(argv, ++index, arg);
    else if (arg === "--project-name") parsed.projectName = requireNextValue(argv, ++index, arg);
    else if (arg === "--api-base-url") parsed.apiBaseUrl = requireNextValue(argv, ++index, arg);
    else if (arg === "--console-url") parsed.consoleUrl = requireNextValue(argv, ++index, arg);
    else if (arg === "--merchant-id") parsed.merchantId = requireNextValue(argv, ++index, arg);
    else if (arg === "--api-key") parsed.apiKey = requireNextValue(argv, ++index, arg);
    else if (arg === "--startup-timeout-ms") parsed.startupTimeoutMs = requireNextValue(argv, ++index, arg);
    else if (arg === "--request-timeout-ms") parsed.requestTimeoutMs = requireNextValue(argv, ++index, arg);
    else if (arg === "--interval-ms") parsed.intervalMs = requireNextValue(argv, ++index, arg);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return parsed;
}

function printHelp() {
  console.log(`RedeemLoop Docker Compose smoke

Usage:
  node scripts/compose-smoke.mjs [options]

Options:
  --compose-file PATH        Compose file. Defaults to docker-compose.yml.
  --project-name NAME        Optional Docker Compose project name.
  --api-base-url URL         API URL. Defaults to http://127.0.0.1:3002.
  --console-url URL          Console URL. Defaults to http://127.0.0.1:3000.
  --merchant-id ID           Merchant ID. Defaults to merchant_cafe.
  --api-key KEY              Merchant API key. Defaults to dev-secret.
  --startup-timeout-ms NUM   Startup wait timeout. Defaults to 120000.
  --request-timeout-ms NUM   HTTP request timeout. Defaults to 8000.
  --interval-ms NUM          Poll interval. Defaults to 2000.
  --skip-up                  Do not run docker compose up; only check running services.
  --skip-build               Run docker compose up -d without --build.
  --keep-up                  Do not run docker compose down after checks.
  --json                     Print only the JSON report to stdout.
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
