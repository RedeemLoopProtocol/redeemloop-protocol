#!/usr/bin/env node

const mode = process.argv.includes("--production") ? "production" : "sandbox";

const required = mode === "production"
  ? ["REDEEMLOOP_API_KEYS", "REDEEMLOOP_EMBED_ALLOWED_ORIGINS"]
  : [];

const recommended = [
  "EVM_MIN_CONFIRMATIONS",
  "WEBHOOK_MAX_ATTEMPTS",
  "WEBHOOK_DELIVERY_LEASE_MS",
  "WEBHOOK_REQUEST_TIMEOUT_MS",
  "RATE_LIMIT_WINDOW_MS",
  "RATE_LIMIT_MAX",
];

const missing = required.filter((name) => !process.env[name]);
const warnings = recommended.filter((name) => !process.env[name]);
const hasDatabasePersistence = Boolean(process.env.REDEEMLOOP_DATABASE_URL);
const hasFilePersistence = Boolean(process.env.REDEEMLOOP_STORAGE_FILE);

if (!hasDatabasePersistence && !hasFilePersistence) {
  missing.push(mode === "production" ? "REDEEMLOOP_DATABASE_URL or REDEEMLOOP_STORAGE_FILE" : "REDEEMLOOP_DATABASE_URL or REDEEMLOOP_STORAGE_FILE");
}

if (mode === "production" && !hasDatabasePersistence && hasFilePersistence) {
  warnings.push("REDEEMLOOP_DATABASE_URL is recommended for beta/production persistence; REDEEMLOOP_STORAGE_FILE is a sandbox fallback");
}

if (hasDatabasePersistence) {
  validateDatabaseUrl(process.env.REDEEMLOOP_DATABASE_URL);
}

if (process.env.REDEEMLOOP_API_KEYS) {
  validateApiKeys(process.env.REDEEMLOOP_API_KEYS);
}

if (mode === "production" && process.env.REDEEMLOOP_EMBED_ALLOWED_ORIGINS === "*") {
  missing.push("REDEEMLOOP_EMBED_ALLOWED_ORIGINS must not be '*' in production");
} else if (process.env.REDEEMLOOP_EMBED_ALLOWED_ORIGINS === "*") {
  warnings.push("REDEEMLOOP_EMBED_ALLOWED_ORIGINS should not be '*' outside local experiments");
}

if (mode === "production" && process.env.RATE_LIMIT_DISABLED === "true") {
  missing.push("RATE_LIMIT_DISABLED must not be true in production");
}

if (process.env.EVM_RPC_URLS) {
  validateEvmRpcUrls(process.env.EVM_RPC_URLS);
}

for (const name of [
  "WEBHOOK_MAX_ATTEMPTS",
  "WEBHOOK_DELIVERY_LEASE_MS",
  "WEBHOOK_REQUEST_TIMEOUT_MS",
  "REDEEMLOOP_WORKER_INTERVAL_MS",
  "REDEEMLOOP_WORKER_BATCH_SIZE",
  "REDEEMLOOP_WORKER_REQUEST_TIMEOUT_MS",
  "RATE_LIMIT_WINDOW_MS",
  "RATE_LIMIT_MAX",
]) {
  if (process.env[name]) validatePositiveInteger(process.env[name], name);
}

if (mode === "production" && process.env.RELAYER_DRY_RUN !== "false") {
  warnings.push("RELAYER_DRY_RUN should be false only after commerce and settlement credentials are ready");
}

if (process.env.XVERSE_NETWORK && !["mainnet", "signet", "testnet4"].includes(process.env.XVERSE_NETWORK)) {
  throw new Error("XVERSE_NETWORK must be mainnet, signet, or testnet4");
}

if (mode === "production" && !process.env.XVERSE_API_KEY) {
  warnings.push("XVERSE_API_KEY is required before enabling API-level Rune settlement recheck");
}

if (missing.length > 0) {
  console.error(`RedeemLoop env check failed for ${mode}:`);
  for (const name of missing) console.error(`- Missing ${name}`);
  process.exit(1);
}

console.log(`RedeemLoop env check passed for ${mode}.`);
if (warnings.length > 0) {
  console.log("Warnings:");
  for (const warning of warnings) console.log(`- ${warning}`);
}

function validateApiKeys(input) {
  const trimmed = input.trim();
  if (!trimmed) throw new Error("REDEEMLOOP_API_KEYS cannot be empty");
  if (trimmed.startsWith("{")) {
    const parsed = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("REDEEMLOOP_API_KEYS JSON must be an object");
    }
    return;
  }
  for (const entry of trimmed.split(",")) {
    if (!entry.trim()) continue;
    if (!entry.includes(":")) {
      throw new Error("REDEEMLOOP_API_KEYS entries must use merchantId:apiKey");
    }
  }
}

function validateEvmRpcUrls(input) {
  const trimmed = input.trim();
  if (!trimmed) throw new Error("EVM_RPC_URLS cannot be empty");
  if (trimmed.startsWith("{")) {
    const parsed = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("EVM_RPC_URLS JSON must be an object");
    }
    for (const [chainId, rpcUrl] of Object.entries(parsed)) {
      validateChainId(chainId, "EVM_RPC_URLS");
      if (typeof rpcUrl !== "string" || !rpcUrl.trim()) throw new Error(`EVM_RPC_URLS.${chainId} must be a URL`);
    }
    return;
  }
  for (const entry of trimmed.split(",")) {
    if (!entry.trim()) continue;
    const separator = entry.indexOf(":");
    if (separator <= 0) throw new Error("EVM_RPC_URLS entries must use chainId:rpcUrl");
    validateChainId(entry.slice(0, separator), "EVM_RPC_URLS");
    if (!entry.slice(separator + 1).trim()) throw new Error("EVM_RPC_URLS entries must include rpcUrl");
  }
}

function validateDatabaseUrl(input) {
  const url = new URL(input);
  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error("REDEEMLOOP_DATABASE_URL must use postgres:// or postgresql://");
  }
  if (!url.hostname) throw new Error("REDEEMLOOP_DATABASE_URL must include a host");
  if (!url.pathname || url.pathname === "/") throw new Error("REDEEMLOOP_DATABASE_URL must include a database name");
}

function validateChainId(value, fieldName) {
  const numberValue = Number(value);
  if (!Number.isSafeInteger(numberValue) || numberValue <= 0) throw new Error(`${fieldName} chainId must be a positive integer`);
}

function validatePositiveInteger(value, fieldName) {
  const numberValue = Number(value);
  if (!Number.isSafeInteger(numberValue) || numberValue <= 0) throw new Error(`${fieldName} must be a positive integer`);
}
