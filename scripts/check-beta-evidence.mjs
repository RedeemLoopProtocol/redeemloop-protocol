#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

const manifestPath = resolve(args.manifest ?? "docs/examples/beta-evidence.manifest.example.json");
const manifest = await readJson(manifestPath);
const checks = [];

if (manifest.version !== 1) {
  checks.push(fail("manifest.version", "Manifest version must be 1", manifest.version));
}

if (!stringValue(manifest.release)) {
  checks.push(fail("manifest.release", "Manifest release is required", manifest.release));
}

const artifacts = manifest.artifacts && typeof manifest.artifacts === "object" ? manifest.artifacts : {};
const loadedArtifacts = {};
for (const [name, artifact] of Object.entries(artifacts)) {
  const loaded = await checkArtifact(name, artifact, checks);
  if (loaded !== undefined) loadedArtifacts[name] = loaded;
}

for (const requiredName of ["composeSmoke", "productionReadiness", "evmWalletCertification", "woocommerceCertification", "releaseNotes"]) {
  if (!artifacts[requiredName]) checks.push(fail(`artifact.${requiredName}`, "Required artifact entry is missing", undefined));
}

checkRequiredEvidenceConsistency(loadedArtifacts, checks);

const report = {
  checkedAt: new Date().toISOString(),
  manifestPath,
  release: manifest.release,
  checks,
  summary: summarizeChecks(checks),
};

if (args.json) console.log(JSON.stringify(report, null, 2));
else printReport(report);

process.exitCode = report.summary.fail > 0 ? 1 : 0;

async function checkArtifact(name, artifact, output) {
  if (!artifact || typeof artifact !== "object") {
    output.push(fail(`artifact.${name}`, "Artifact entry must be an object", artifact));
    return;
  }

  const required = artifact.required !== false;
  const type = stringValue(artifact.type);
  const artifactPath = stringValue(artifact.path);
  if (!type) output.push(fail(`artifact.${name}.type`, "Artifact type is required", artifact));
  if (!artifactPath) {
    output.push(required ? fail(`artifact.${name}.path`, "Artifact path is required", artifact) : warn(`artifact.${name}.path`, "Optional artifact path is not configured", artifact));
    return;
  }

  const absolutePath = resolve(artifactPath);
  let raw;
  try {
    raw = await readFile(absolutePath, "utf8");
  } catch (error) {
    output.push(required ? fail(`artifact.${name}`, `Required artifact is missing: ${artifactPath}`, errorMessage(error)) : warn(`artifact.${name}`, `Optional artifact is missing: ${artifactPath}`, undefined));
    return;
  }

  if (type === "markdown") {
    checkMarkdownArtifact(name, raw, output);
    return undefined;
  }

  let json;
  try {
    json = JSON.parse(raw);
  } catch (error) {
    output.push(fail(`artifact.${name}`, "Artifact must be valid JSON", errorMessage(error)));
    return undefined;
  }

  if (type === "compose-smoke") checkComposeSmoke(name, json, output);
  else if (type === "beta-readiness") checkBetaReadiness(name, json, output);
  else if (type === "evm-certification") checkEvmCertification(name, json, output);
  else if (type === "commerce-certification") checkCommerceCertification(name, json, output);
  else output.push(fail(`artifact.${name}.type`, `Unknown artifact type: ${type}`, artifact));
  return json;
}

function checkComposeSmoke(name, json, output) {
  const failCount = Number(json.summary?.fail ?? 0);
  if (failCount > 0) {
    output.push(fail(`artifact.${name}`, "Compose smoke artifact contains failing checks", json.summary));
    return;
  }
  for (const requiredCheck of ["api.health", "console.http", "api.persistence", "webhooks.worker"]) {
    if (!hasPassingCheck(json, requiredCheck)) {
      output.push(fail(`artifact.${name}.${requiredCheck}`, "Compose smoke is missing a passing required check", json.checks));
      return;
    }
  }
  output.push(pass(`artifact.${name}`, "Compose smoke evidence is valid", json.summary));
}

function checkBetaReadiness(name, json, output) {
  const failCount = Number(json.summary?.fail ?? 0);
  if (failCount > 0) {
    output.push(fail(`artifact.${name}`, "Beta readiness artifact contains failing checks", json.summary));
    return;
  }
  for (const requiredCheck of ["api.health", "api.persistence", "api.auth", "webhooks.worker", "evm.rpc"]) {
    if (!hasPassingCheck(json, requiredCheck)) {
      output.push(fail(`artifact.${name}.${requiredCheck}`, "Production readiness is missing a passing required check", json.checks));
      return;
    }
  }
  output.push(pass(`artifact.${name}`, "Production readiness evidence is valid", json.summary));
}

function checkEvmCertification(name, json, output) {
  const requiredFields = ["chainId", "walletName", "walletVersion", "intentId", "txHash", "from", "to", "contract", "amount", "receiptStatus", "confirmations", "checkedAt"];
  const missing = requiredFields.filter((field) => !stringValue(json[field]) && typeof json[field] !== "number");
  if (missing.length > 0) {
    output.push(fail(`artifact.${name}`, `EVM certification is missing fields: ${missing.join(", ")}`, json));
    return;
  }
  if (!Number.isSafeInteger(Number(json.chainId)) || Number(json.chainId) <= 0) {
    output.push(fail(`artifact.${name}`, "EVM chainId must be a positive integer", json.chainId));
    return;
  }
  if (!/^0x[0-9a-fA-F]{64}$/.test(String(json.txHash))) {
    output.push(fail(`artifact.${name}`, "EVM txHash must be a 32-byte hex string", json.txHash));
    return;
  }
  for (const field of ["from", "to", "contract"]) {
    if (!/^0x[0-9a-fA-F]{40}$/.test(String(json[field]))) {
      output.push(fail(`artifact.${name}`, `EVM ${field} must be an address`, json[field]));
      return;
    }
  }
  if (!/^[0-9]+$/.test(String(json.amount)) || BigInt(String(json.amount)) <= 0n) {
    output.push(fail(`artifact.${name}`, "EVM amount must be a positive integer string", json.amount));
    return;
  }
  if (!Number.isSafeInteger(Number(json.confirmations)) || Number(json.confirmations) <= 0) {
    output.push(fail(`artifact.${name}`, "EVM confirmations must be a positive integer", json.confirmations));
    return;
  }
  if (json.receiptStatus !== "success" && json.receiptStatus !== "confirmed") {
    output.push(fail(`artifact.${name}`, "EVM receipt status must be success or confirmed", json.receiptStatus));
    return;
  }
  output.push(pass(`artifact.${name}`, "EVM funded wallet evidence is structurally valid", { chainId: json.chainId, txHash: json.txHash }));
}

function checkCommerceCertification(name, json, output) {
  const requiredFields = ["provider", "storeUrl", "orderId", "intentId", "chainId", "merchantId", "voucherToken", "amount", "receiver", "txHash", "markPaidStatus", "checkedAt"];
  const missing = requiredFields.filter((field) => !stringValue(json[field]) && typeof json[field] !== "number");
  if (missing.length > 0) {
    output.push(fail(`artifact.${name}`, `Commerce certification is missing fields: ${missing.join(", ")}`, json));
    return;
  }
  if (!Number.isSafeInteger(Number(json.chainId)) || Number(json.chainId) <= 0) {
    output.push(fail(`artifact.${name}`, "Commerce chainId must be a positive integer", json.chainId));
    return;
  }
  for (const field of ["voucherToken", "receiver"]) {
    if (!/^0x[0-9a-fA-F]{40}$/.test(String(json[field]))) {
      output.push(fail(`artifact.${name}`, `Commerce ${field} must be an EVM address`, json[field]));
      return;
    }
  }
  if (!/^[0-9]+$/.test(String(json.amount)) || BigInt(String(json.amount)) <= 0n) {
    output.push(fail(`artifact.${name}`, "Commerce amount must be a positive integer string", json.amount));
    return;
  }
  if (!/^0x[0-9a-fA-F]{64}$/.test(String(json.txHash))) {
    output.push(fail(`artifact.${name}`, "Commerce txHash must be a 32-byte hex string", json.txHash));
    return;
  }
  if (typeof json.dryRun !== "boolean") {
    output.push(fail(`artifact.${name}`, "Commerce certification must include dryRun boolean", json.dryRun));
    return;
  }
  if (json.dryRun) {
    output.push(fail(`artifact.${name}`, "Commerce certification must be a live non-dry-run mark-as-paid result", json.dryRun));
    return;
  }
  if (json.markPaidStatus !== "paid" && json.markPaidStatus !== "payment_complete") {
    output.push(fail(`artifact.${name}`, "Commerce mark-paid status must be paid or payment_complete", json.markPaidStatus));
    return;
  }
  output.push(pass(`artifact.${name}`, "Commerce certification evidence is structurally valid", { provider: json.provider, orderId: json.orderId }));
}

function checkRequiredEvidenceConsistency(artifacts, output) {
  const evm = artifacts.evmWalletCertification;
  const woo = artifacts.woocommerceCertification;
  if (!evm || !woo) return;

  const comparisons = [
    ["intentId", stringValue(evm.intentId), stringValue(woo.intentId)],
    ["chainId", String(evm.chainId ?? ""), String(woo.chainId ?? "")],
    ["txHash", lowerString(evm.txHash), lowerString(woo.txHash)],
    ["voucherToken", lowerString(evm.contract), lowerString(woo.voucherToken)],
    ["receiver", lowerString(evm.to), lowerString(woo.receiver)],
    ["amount", String(evm.amount ?? ""), String(woo.amount ?? "")],
  ];
  const mismatches = comparisons
    .filter(([, evmValue, wooValue]) => !evmValue || !wooValue || evmValue !== wooValue)
    .map(([field, evmValue, wooValue]) => ({ field, evm: evmValue, woocommerce: wooValue }));

  if (mismatches.length > 0) {
    output.push(fail("artifact.consistency.evm_woocommerce", "EVM funded-wallet evidence and WooCommerce mark-as-paid evidence must describe the same payment", mismatches));
    return;
  }

  output.push(pass("artifact.consistency.evm_woocommerce", "EVM and WooCommerce evidence describe the same PaymentIntent, transaction, token, receiver, and amount", {
    intentId: woo.intentId,
    chainId: woo.chainId,
    txHash: woo.txHash,
  }));
}

function checkMarkdownArtifact(name, raw, output) {
  if (!raw.trim()) {
    output.push(fail(`artifact.${name}`, "Markdown artifact is empty", undefined));
    return;
  }
  if (raw.includes("BETA_EVIDENCE_PLACEHOLDER")) {
    output.push(fail(`artifact.${name}`, "Markdown artifact still contains the beta evidence placeholder marker", undefined));
    return;
  }
  output.push(pass(`artifact.${name}`, "Markdown artifact exists", undefined));
}

function hasPassingCheck(json, checkName) {
  return Array.isArray(json.checks) && json.checks.some((item) => item?.name === checkName && item?.status === "pass");
}

async function readJson(path) {
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw);
}

function parseArgs(argv) {
  const parsed = { json: false, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--") continue;
    else if (arg === "--json") parsed.json = true;
    else if (arg === "--help" || arg === "-h") parsed.help = true;
    else if (arg === "--manifest") parsed.manifest = requireNextValue(argv, ++index, arg);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return parsed;
}

function printHelp() {
  console.log(`RedeemLoop beta evidence validator

Usage:
  node scripts/check-beta-evidence.mjs --manifest path/to/manifest.json [--json]

The manifest lists external certification artifacts to validate before publishing a beta release.
`);
}

function printReport(report) {
  console.log(`RedeemLoop beta evidence check: ${report.release}`);
  console.log(`Manifest: ${report.manifestPath}`);
  console.log("");
  for (const item of report.checks) {
    console.log(`[${item.status.toUpperCase()}] ${item.name} - ${item.message}`);
  }
  console.log("");
  console.log(`Summary: ${report.summary.pass} pass, ${report.summary.warn} warn, ${report.summary.fail} fail`);
}

function requireNextValue(argv, index, flag) {
  const value = argv[index];
  if (!value) throw new Error(`${flag} requires a value`);
  return value;
}

function pass(name, message, details) {
  return { name, status: "pass", message, details };
}

function warn(name, message, details) {
  return { name, status: "warn", message, details };
}

function fail(name, message, details) {
  return { name, status: "fail", message, details };
}

function summarizeChecks(items) {
  return {
    pass: items.filter((item) => item.status === "pass").length,
    warn: items.filter((item) => item.status === "warn").length,
    fail: items.filter((item) => item.status === "fail").length,
  };
}

function stringValue(value) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function lowerString(value) {
  return stringValue(value)?.toLowerCase();
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
