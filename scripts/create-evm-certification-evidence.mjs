#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const erc20TransferTopic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

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
    console.error(`Wrote EVM certification evidence: ${input.out}`);
  }
  if (!input.out || input.json) {
    console.log(output.trimEnd());
  }
} catch (error) {
  console.error(`RedeemLoop EVM certification evidence failed: ${errorMessage(error)}`);
  process.exit(1);
}

async function createEvidence(input) {
  const [rpcChainIdHex, receipt, latestBlockHex] = await Promise.all([
    rpcCall(input.rpcUrl, "eth_chainId", [], input.timeoutMs),
    rpcCall(input.rpcUrl, "eth_getTransactionReceipt", [input.txHash], input.timeoutMs),
    rpcCall(input.rpcUrl, "eth_blockNumber", [], input.timeoutMs),
  ]);

  const rpcChainId = hexToNumber(rpcChainIdHex, "eth_chainId");
  if (rpcChainId !== input.chainId) {
    throw new Error(`RPC chainId mismatch: expected ${input.chainId}, got ${rpcChainId}`);
  }
  if (!receipt || typeof receipt !== "object") {
    throw new Error("Transaction receipt is missing; the transaction may still be pending or the RPC is on the wrong chain");
  }

  const receiptTxHash = stringValue(receipt.transactionHash);
  if (receiptTxHash && receiptTxHash.toLowerCase() !== input.txHash.toLowerCase()) {
    throw new Error("Receipt transactionHash does not match tx hash");
  }

  const status = normalizeReceiptStatus(receipt.status);
  if (status !== "success") {
    throw new Error(`Transaction receipt is not successful: ${String(receipt.status)}`);
  }

  if (stringValue(receipt.from) && normalizeAddress(receipt.from, "receipt.from") !== input.from) {
    throw new Error("Receipt sender does not match expected payer address");
  }
  if (stringValue(receipt.to) && normalizeAddress(receipt.to, "receipt.to") !== input.contract) {
    throw new Error("Receipt recipient does not match expected ERC-20 contract");
  }

  const receiptBlock = hexToBigInt(receipt.blockNumber, "receipt.blockNumber");
  const latestBlock = hexToBigInt(latestBlockHex, "eth_blockNumber");
  if (latestBlock < receiptBlock) throw new Error("RPC latest block is behind the receipt block");
  const confirmations = bigintToSafeNumber(latestBlock - receiptBlock + 1n, "confirmations");
  if (confirmations < input.minConfirmations) {
    throw new Error(`Insufficient confirmations: expected at least ${input.minConfirmations}, got ${confirmations}`);
  }

  const transferLog = findMatchingTransferLog(receipt.logs, input);
  if (!transferLog) {
    throw new Error("No matching ERC-20 Transfer log found for the expected contract, payer, receiver, and amount");
  }

  return {
    chainId: input.chainId,
    walletName: input.walletName,
    walletVersion: input.walletVersion,
    intentId: input.intentId,
    txHash: input.txHash,
    from: input.from,
    to: input.to,
    contract: input.contract,
    amount: input.amount,
    receiptStatus: "confirmed",
    confirmations,
    checkedAt: new Date().toISOString(),
    blockNumber: bigintToSafeNumber(receiptBlock, "blockNumber"),
    latestBlockNumber: bigintToSafeNumber(latestBlock, "latestBlockNumber"),
    logIndex: logIndexOf(transferLog),
    rpcOrigin: rpcOriginOf(input.rpcUrl),
  };
}

function findMatchingTransferLog(logs, input) {
  if (!Array.isArray(logs)) throw new Error("Receipt logs must be an array");
  return logs.find((log) => {
    if (!log || typeof log !== "object") return false;
    if (normalizeAddressOrUndefined(log.address) !== input.contract) return false;
    const topics = Array.isArray(log.topics) ? log.topics : [];
    if (typeof topics[0] !== "string" || topics[0].toLowerCase() !== erc20TransferTopic) return false;
    if (topicToAddress(topics[1]) !== input.from) return false;
    if (topicToAddress(topics[2]) !== input.to) return false;
    try {
      return hexToBigInt(log.data, "Transfer.data") === BigInt(input.amount);
    } catch {
      return false;
    }
  });
}

async function rpcCall(rpcUrl, method, params, timeoutMs) {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const bodyText = await response.text();
  let body;
  try {
    body = bodyText ? JSON.parse(bodyText) : {};
  } catch {
    throw new Error(`${method} returned non-JSON response with status ${response.status}`);
  }
  if (!response.ok) throw new Error(`${method} failed with HTTP ${response.status}`);
  if (body.error) throw new Error(`${method} RPC error: ${body.error.message ?? JSON.stringify(body.error)}`);
  return body.result;
}

function normalizeInput(raw) {
  const chainId = positiveInteger(raw.chainId, "chainId");
  return {
    rpcUrl: resolveRpcUrl(chainId, raw.rpcUrl),
    chainId,
    walletName: requireString(raw.walletName, "walletName"),
    walletVersion: requireString(raw.walletVersion, "walletVersion"),
    intentId: requireString(raw.intentId, "intentId"),
    txHash: normalizeTxHash(raw.txHash),
    from: normalizeAddress(raw.from, "from"),
    to: normalizeAddress(raw.to, "to"),
    contract: normalizeAddress(raw.contract, "contract"),
    amount: positiveIntegerString(raw.amount, "amount"),
    minConfirmations: positiveInteger(raw.minConfirmations ?? 1, "minConfirmations"),
    timeoutMs: positiveInteger(raw.timeoutMs ?? 10000, "timeoutMs"),
    out: raw.out ? resolve(raw.out) : undefined,
    json: raw.json,
  };
}

function resolveRpcUrl(chainId, argRpcUrl) {
  const rpcUrl = argRpcUrl ?? process.env.EVM_CERTIFICATION_RPC_URL ?? rpcUrlFromMap(process.env.EVM_RPC_URLS, chainId) ?? process.env.RPC_URL;
  if (!rpcUrl) throw new Error("RPC URL is required. Pass --rpc-url, EVM_CERTIFICATION_RPC_URL, EVM_RPC_URLS, or RPC_URL.");
  try {
    const url = new URL(rpcUrl);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error();
    return url.toString();
  } catch {
    throw new Error("RPC URL must be a valid http(s) URL");
  }
}

function rpcUrlFromMap(input, chainId) {
  if (!input?.trim()) return undefined;
  const trimmed = input.trim();
  if (trimmed.startsWith("{")) {
    const parsed = JSON.parse(trimmed);
    const value = parsed[String(chainId)];
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
  }
  for (const entry of trimmed.split(",")) {
    const separator = entry.indexOf(":");
    if (separator <= 0) continue;
    if (Number(entry.slice(0, separator)) === chainId) return entry.slice(separator + 1).trim();
  }
  return undefined;
}

function parseArgs(argv) {
  const parsed = {
    help: false,
    json: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--") continue;
    else if (arg === "--help" || arg === "-h") parsed.help = true;
    else if (arg === "--json") parsed.json = true;
    else if (arg === "--rpc-url") parsed.rpcUrl = requireNextValue(argv, ++index, arg);
    else if (arg === "--chain-id") parsed.chainId = requireNextValue(argv, ++index, arg);
    else if (arg === "--wallet-name") parsed.walletName = requireNextValue(argv, ++index, arg);
    else if (arg === "--wallet-version") parsed.walletVersion = requireNextValue(argv, ++index, arg);
    else if (arg === "--intent-id") parsed.intentId = requireNextValue(argv, ++index, arg);
    else if (arg === "--tx-hash") parsed.txHash = requireNextValue(argv, ++index, arg);
    else if (arg === "--from") parsed.from = requireNextValue(argv, ++index, arg);
    else if (arg === "--to") parsed.to = requireNextValue(argv, ++index, arg);
    else if (arg === "--contract") parsed.contract = requireNextValue(argv, ++index, arg);
    else if (arg === "--amount") parsed.amount = requireNextValue(argv, ++index, arg);
    else if (arg === "--min-confirmations") parsed.minConfirmations = requireNextValue(argv, ++index, arg);
    else if (arg === "--timeout-ms") parsed.timeoutMs = requireNextValue(argv, ++index, arg);
    else if (arg === "--out") parsed.out = requireNextValue(argv, ++index, arg);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return parsed;
}

function printHelp() {
  console.log(`RedeemLoop EVM certification evidence generator

Usage:
  node scripts/create-evm-certification-evidence.mjs \\
    --chain-id 1 \\
    --rpc-url https://rpc.example \\
    --wallet-name "MetaMask" \\
    --wallet-version "11.0.0" \\
    --intent-id pi_example \\
    --tx-hash 0x... \\
    --from 0xPayer \\
    --to 0xMerchantVault \\
    --contract 0xVoucherToken \\
    --amount 1 \\
    --out evidence/evm-wallet-certification.json

The command is read-only. It calls eth_chainId, eth_getTransactionReceipt, and eth_blockNumber,
then verifies the receipt status, confirmations, transaction sender, ERC-20 contract, and Transfer log.
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

function stringValue(value) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
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

function normalizeTxHash(value) {
  const normalized = requireString(value, "txHash").toLowerCase();
  if (!/^0x[0-9a-f]{64}$/.test(normalized)) throw new Error("txHash must be a 32-byte hex string");
  return normalized;
}

function normalizeAddress(value, fieldName) {
  const normalized = requireString(value, fieldName).toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(normalized)) throw new Error(`${fieldName} must be an EVM address`);
  return normalized;
}

function normalizeAddressOrUndefined(value) {
  try {
    return normalizeAddress(value, "address");
  } catch {
    return undefined;
  }
}

function topicToAddress(value) {
  if (typeof value !== "string") return undefined;
  const normalized = value.toLowerCase();
  if (!/^0x[0-9a-f]{64}$/.test(normalized)) return undefined;
  return `0x${normalized.slice(-40)}`;
}

function normalizeReceiptStatus(status) {
  if (status === "success" || status === "0x1") return "success";
  if (status === "reverted" || status === "0x0") return "reverted";
  return String(status);
}

function hexToBigInt(value, fieldName) {
  if (typeof value !== "string" || !/^0x[0-9a-fA-F]+$/.test(value)) throw new Error(`${fieldName} must be a hex quantity`);
  return BigInt(value);
}

function hexToNumber(value, fieldName) {
  return bigintToSafeNumber(hexToBigInt(value, fieldName), fieldName);
}

function bigintToSafeNumber(value, fieldName) {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error(`${fieldName} exceeds Number.MAX_SAFE_INTEGER`);
  return Number(value);
}

function logIndexOf(log) {
  if (!log || typeof log !== "object" || typeof log.logIndex !== "string") return undefined;
  return hexToNumber(log.logIndex, "logIndex");
}

function rpcOriginOf(rpcUrl) {
  try {
    return new URL(rpcUrl).origin;
  } catch {
    return undefined;
  }
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
