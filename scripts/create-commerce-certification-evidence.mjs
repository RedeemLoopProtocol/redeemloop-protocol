#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

try {
  const input = normalizeInput(args);
  const evidence = await createEvidence(input);
  const output = `${JSON.stringify(evidence, null, 2)}\n`;
  if (input.out) {
    await mkdir(dirname(input.out), { recursive: true });
    await writeFile(input.out, output, "utf8");
    console.error(`Wrote commerce certification evidence: ${input.out}`);
  }
  if (!input.out || input.json) {
    console.log(output.trimEnd());
  }
} catch (error) {
  console.error(`RedeemLoop commerce certification evidence failed: ${errorMessage(error)}`);
  process.exit(1);
}

async function createEvidence(input) {
  const result = await postJson(new URL("/v1/commerce/confirm", input.apiBaseUrl), {
    provider: input.provider,
    chainId: input.chainId,
    merchantId: input.merchantId,
    orderId: input.orderId,
    voucherToken: input.voucherToken,
    amount: input.amount,
    receiver: input.receiver,
    paymentId: input.paymentId ?? input.intentId,
    txHash: input.txHash,
    dryRun: input.dryRun,
  }, input);

  const commerce = recordOf(result.commerce);
  const dryRun = result.dryRun === true || commerce.dryRun === true;
  const markedPaid = result.status === "paid" || commerce.markedPaid === true;
  if (dryRun && !input.allowDryRun) {
    throw new Error("Commerce confirmation was dry-run; rerun against live credentials or pass --allow-dry-run for non-beta evidence");
  }
  if (!markedPaid && !input.allowDryRun) {
    throw new Error(`Commerce confirmation did not mark the order paid; status=${String(result.status)}, markedPaid=${String(commerce.markedPaid)}`);
  }

  const request = recordOf(commerce.request);
  const storeUrl = input.storeUrl ?? storeUrlFromRequest(request.url);
  if (!storeUrl) throw new Error("storeUrl is required when it cannot be derived from the commerce request URL");

  return {
    provider: input.provider,
    storeUrl,
    orderId: input.orderId,
    intentId: input.intentId,
    paymentId: stringValue(result.paymentId) ?? input.paymentId ?? input.intentId,
    markPaidStatus: markedPaid ? "paid" : "verified",
    dryRun,
    checkedAt: new Date().toISOString(),
    requestUrl: stringValue(request.url),
    responseStatus: stringValue(result.status),
  };
}

async function postJson(url, payload, input) {
  const headers = new Headers();
  headers.set("content-type", "application/json");
  if (input.apiKey) headers.set("authorization", `Bearer ${input.apiKey}`);
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(input.timeoutMs),
  });
  const rawBody = await response.text();
  const body = parseJson(rawBody);
  if (!response.ok) {
    throw new Error(`API returned ${response.status}: ${JSON.stringify(body)}`);
  }
  return body;
}

function normalizeInput(raw) {
  const provider = requireProvider(raw.provider);
  const apiBaseUrl = normalizeUrl(raw.apiBaseUrl ?? process.env.REDEEMLOOP_API_BASE_URL ?? "http://127.0.0.1:3002", "apiBaseUrl");
  return {
    provider,
    apiBaseUrl,
    apiKey: raw.apiKey ?? process.env.REDEEMLOOP_API_KEY,
    storeUrl: raw.storeUrl ? normalizeUrl(raw.storeUrl, "storeUrl") : undefined,
    orderId: requireString(raw.orderId, "orderId"),
    intentId: requireString(raw.intentId, "intentId"),
    paymentId: optionalString(raw.paymentId, "paymentId"),
    chainId: positiveInteger(raw.chainId, "chainId"),
    merchantId: requireString(raw.merchantId, "merchantId"),
    voucherToken: normalizeAddress(raw.voucherToken, "voucherToken"),
    amount: positiveIntegerString(raw.amount, "amount"),
    receiver: normalizeAddress(raw.receiver, "receiver"),
    txHash: raw.txHash ? normalizeTxHash(raw.txHash) : undefined,
    dryRun: raw.dryRun,
    allowDryRun: raw.allowDryRun,
    timeoutMs: positiveInteger(raw.timeoutMs ?? 10000, "timeoutMs"),
    out: raw.out ? resolve(raw.out) : undefined,
    json: raw.json,
  };
}

function parseArgs(argv) {
  const parsed = {
    help: false,
    json: false,
    dryRun: false,
    allowDryRun: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--") continue;
    else if (arg === "--help" || arg === "-h") parsed.help = true;
    else if (arg === "--json") parsed.json = true;
    else if (arg === "--dry-run") parsed.dryRun = true;
    else if (arg === "--allow-dry-run") parsed.allowDryRun = true;
    else if (arg === "--api-base-url") parsed.apiBaseUrl = requireNextValue(argv, ++index, arg);
    else if (arg === "--api-key") parsed.apiKey = requireNextValue(argv, ++index, arg);
    else if (arg === "--provider") parsed.provider = requireNextValue(argv, ++index, arg);
    else if (arg === "--store-url") parsed.storeUrl = requireNextValue(argv, ++index, arg);
    else if (arg === "--order-id") parsed.orderId = requireNextValue(argv, ++index, arg);
    else if (arg === "--intent-id") parsed.intentId = requireNextValue(argv, ++index, arg);
    else if (arg === "--payment-id") parsed.paymentId = requireNextValue(argv, ++index, arg);
    else if (arg === "--chain-id") parsed.chainId = requireNextValue(argv, ++index, arg);
    else if (arg === "--merchant-id") parsed.merchantId = requireNextValue(argv, ++index, arg);
    else if (arg === "--voucher-token") parsed.voucherToken = requireNextValue(argv, ++index, arg);
    else if (arg === "--amount") parsed.amount = requireNextValue(argv, ++index, arg);
    else if (arg === "--receiver") parsed.receiver = requireNextValue(argv, ++index, arg);
    else if (arg === "--tx-hash") parsed.txHash = requireNextValue(argv, ++index, arg);
    else if (arg === "--timeout-ms") parsed.timeoutMs = requireNextValue(argv, ++index, arg);
    else if (arg === "--out") parsed.out = requireNextValue(argv, ++index, arg);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return parsed;
}

function printHelp() {
  console.log(`RedeemLoop commerce certification evidence generator

Usage:
  node scripts/create-commerce-certification-evidence.mjs \\
    --api-base-url https://api.example.com \\
    --api-key merchant-api-key \\
    --provider woocommerce \\
    --store-url https://store.example \\
    --order-id 1001 \\
    --intent-id pi_example \\
    --chain-id 1 \\
    --merchant-id merchant_cafe \\
    --voucher-token 0xVoucherToken \\
    --amount 1 \\
    --receiver 0xMerchantVault \\
    --tx-hash 0x... \\
    --out evidence/woocommerce-certification.json

The command calls RedeemLoop /v1/commerce/confirm and expects a live paid result.
Use --dry-run --allow-dry-run only for local non-beta evidence; dry-run artifacts do not pass beta validation.
`);
}

function requireNextValue(argv, index, flag) {
  const value = argv[index];
  if (!value) throw new Error(`${flag} requires a value`);
  return value;
}

function requireString(value, fieldName) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${fieldName} is required`);
  return value.trim();
}

function optionalString(value, fieldName) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") throw new Error(`${fieldName} must be a string`);
  return value.trim();
}

function stringValue(value) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function requireProvider(value) {
  if (value === "woocommerce" || value === "shopify") return value;
  throw new Error("provider must be woocommerce or shopify");
}

function positiveInteger(value, fieldName) {
  const numberValue = Number(value);
  if (!Number.isSafeInteger(numberValue) || numberValue <= 0) throw new Error(`${fieldName} must be a positive integer`);
  return numberValue;
}

function positiveIntegerString(value, fieldName) {
  const normalized = requireString(value, fieldName);
  if (!/^[0-9]+$/.test(normalized) || BigInt(normalized) <= 0n) throw new Error(`${fieldName} must be a positive integer string`);
  return normalized;
}

function normalizeAddress(value, fieldName) {
  const normalized = requireString(value, fieldName).toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(normalized)) throw new Error(`${fieldName} must be an EVM address`);
  return normalized;
}

function normalizeTxHash(value) {
  const normalized = requireString(value, "txHash").toLowerCase();
  if (!/^0x[0-9a-f]{64}$/.test(normalized)) throw new Error("txHash must be a 32-byte hex string");
  return normalized;
}

function normalizeUrl(value, fieldName) {
  const raw = requireString(value, fieldName);
  try {
    const url = new URL(raw);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error();
    return url.toString().replace(/\/$/, "");
  } catch {
    throw new Error(`${fieldName} must be a valid http(s) URL`);
  }
}

function storeUrlFromRequest(value) {
  if (typeof value !== "string" || !value.trim()) return undefined;
  try {
    const url = new URL(value);
    if (url.hostname.endsWith(".myshopify.com")) return url.origin;
    const wooMarker = "/wp-json/wc/";
    const markerIndex = url.pathname.indexOf(wooMarker);
    if (markerIndex >= 0) {
      url.pathname = url.pathname.slice(0, markerIndex) || "/";
      url.search = "";
      url.hash = "";
      return url.toString().replace(/\/$/, "");
    }
    return url.origin;
  } catch {
    return undefined;
  }
}

function parseJson(rawBody) {
  try {
    return rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return rawBody;
  }
}

function recordOf(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
