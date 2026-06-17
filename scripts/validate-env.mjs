#!/usr/bin/env node

const mode = process.argv.includes("--production") ? "production" : "sandbox";

const required = mode === "production"
  ? ["REDEEMLOOP_STORAGE_FILE", "REDEEMLOOP_API_KEYS", "REDEEMLOOP_EMBED_ALLOWED_ORIGINS"]
  : ["REDEEMLOOP_STORAGE_FILE"];

const recommended = [
  "EVM_MIN_CONFIRMATIONS",
  "WEBHOOK_MAX_ATTEMPTS",
];

const missing = required.filter((name) => !process.env[name]);
const warnings = recommended.filter((name) => !process.env[name]);

if (process.env.REDEEMLOOP_API_KEYS) {
  validateApiKeys(process.env.REDEEMLOOP_API_KEYS);
}

if (process.env.REDEEMLOOP_EMBED_ALLOWED_ORIGINS === "*") {
  warnings.push("REDEEMLOOP_EMBED_ALLOWED_ORIGINS should not be '*' outside local experiments");
}

if (mode === "production" && process.env.RELAYER_DRY_RUN !== "false") {
  warnings.push("RELAYER_DRY_RUN should be false only after commerce and settlement credentials are ready");
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
