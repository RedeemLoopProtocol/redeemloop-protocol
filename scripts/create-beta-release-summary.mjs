#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { basename, dirname, relative, resolve, sep } from "node:path";

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printHelp();
  process.exit(0);
}

try {
  const input = normalizeInput(args);
  const manifest = await readJson(input.manifest);
  const validation = runEvidenceCheck(input.manifest);
  const blockingFailures = validation.checks.filter((item) => item.status === "fail" && !item.name.startsWith("artifact.releaseNotes"));
  if (blockingFailures.length > 0 && !input.allowInvalid) {
    throw new Error(`Evidence artifacts are not ready: ${blockingFailures.map((item) => item.name).join(", ")}`);
  }

  const artifacts = await loadArtifacts(manifest);
  const markdown = renderSummary({
    manifestPath: publicPath(input.manifest),
    manifest,
    validation,
    artifacts,
  });

  if (input.out) {
    await mkdir(dirname(input.out), { recursive: true });
    await writeFile(input.out, markdown, "utf8");
    console.error(`Wrote beta release evidence summary: ${input.out}`);
  } else {
    console.log(markdown.trimEnd());
  }
} catch (error) {
  console.error(`RedeemLoop beta release evidence summary failed: ${errorMessage(error)}`);
  process.exit(1);
}

async function loadArtifacts(manifest) {
  return {
    composeSmoke: await readArtifact(manifest, "composeSmoke"),
    productionReadiness: await readArtifact(manifest, "productionReadiness"),
    evmWalletCertification: await readArtifact(manifest, "evmWalletCertification"),
    woocommerceCertification: await readArtifact(manifest, "woocommerceCertification"),
    shopifyCertification: await readArtifact(manifest, "shopifyCertification", { optional: true }),
  };
}

async function readArtifact(manifest, name, options = {}) {
  const artifact = manifest.artifacts?.[name];
  const path = stringValue(artifact?.path);
  if (!path) {
    if (options.optional) return undefined;
    throw new Error(`Artifact path is missing: ${name}`);
  }
  try {
    return JSON.parse(await readFile(resolve(path), "utf8"));
  } catch (error) {
    if (options.optional) return undefined;
    throw new Error(`Artifact could not be loaded: ${name}: ${errorMessage(error)}`);
  }
}

function renderSummary(input) {
  const release = stringValue(input.manifest.release) ?? "unknown release";
  const checkedAt = new Date().toISOString();
  const evm = input.artifacts.evmWalletCertification;
  const woo = input.artifacts.woocommerceCertification;
  const shopify = input.artifacts.shopifyCertification;
  const composeSummary = summarizeArtifact(input.artifacts.composeSmoke);
  const readinessSummary = summarizeArtifact(input.artifacts.productionReadiness);
  const evmLine = `${evm.walletName} ${evm.walletVersion} on chain ${evm.chainId}, transaction ${shortHash(evm.txHash)}, ${evm.confirmations} confirmation(s)`;
  const wooLine = `${titleCase(woo.provider)} order ${maskIdentifier(woo.orderId)} marked ${woo.markPaidStatus}`;
  const shopifyLine = shopify ? `${titleCase(shopify.provider)} order ${maskIdentifier(shopify.orderId)} marked ${shopify.markPaidStatus}` : "Not certified in this beta evidence set";
  const scopeRows = [
    ["Docker Compose smoke", "Pass", `API, console, Postgres persistence, and webhook worker heartbeat (${composeSummary})`],
    ["Production readiness", "Pass", `API health, Postgres persistence, merchant API keys, webhook worker, and EVM RPC (${readinessSummary})`],
    ["Funded EVM payment", "Pass", evmLine],
    ["WooCommerce mark-as-paid", "Pass", wooLine],
    ["Shopify mark-as-paid", shopify ? "Pass" : "Not claimed", shopifyLine],
  ];
  const zhRows = [
    ["Docker Compose smoke", "通过", `API、console、Postgres persistence 和 webhook worker heartbeat（${composeSummary}）`],
    ["Production readiness", "通过", `API health、Postgres persistence、商户 API key、webhook worker 和 EVM RPC（${readinessSummary}）`],
    ["Funded EVM payment", "通过", `${evm.walletName} ${evm.walletVersion}，chain ${evm.chainId}，交易 ${shortHash(evm.txHash)}，${evm.confirmations} 个确认`],
    ["WooCommerce mark-as-paid", "通过", `${titleCase(woo.provider)} 订单 ${maskIdentifier(woo.orderId)} 已标记为 ${woo.markPaidStatus}`],
    ["Shopify mark-as-paid", shopify ? "通过" : "未声明", shopify ? `${titleCase(shopify.provider)} 订单 ${maskIdentifier(shopify.orderId)} 已标记为 ${shopify.markPaidStatus}` : "本次 beta evidence set 未认证 Shopify live path"],
  ];

  return `# RedeemLoop ${release} Beta Release Evidence

## English

### Certification Status

This beta release is evidence-gated. The required artifacts were validated by \`pnpm beta:evidence:check\`; this public summary redacts wallet addresses, transaction hashes, store URLs, and order identifiers.

| Area | Status | Evidence |
|------|--------|----------|
${scopeRows.map((row) => `| ${row[0]} | ${row[1]} | ${row[2]} |`).join("\n")}

### Certified Scope

- RedeemLoop can run the beta sandbox stack with API, console, Postgres persistence, and standalone webhook worker services.
- The target deployment exposes production readiness signals for API health, persistence, merchant API keys, webhook worker recency, and EVM RPC diagnostics.
- One funded ERC-20 voucher payment was independently checked from an RPC receipt and matching Transfer log.
- One WooCommerce test order was marked paid through RedeemLoop commerce confirmation without dry-run mode.

### Not Claimed

- Shopify live support is claimed only when the optional Shopify certification row is marked Pass.
- Bitcoin Rune, Fractal, inscription, and NFT paths remain adapter or certification-track support unless separate live evidence is attached.
- This summary is public-safe; private evidence artifacts remain in the local evidence folder.

### Evidence Metadata

- Release: \`${release}\`
- Manifest: \`${input.manifestPath}\`
- Manifest checked at: \`${input.manifest.checkedAt ?? "not recorded"}\`
- Summary generated at: \`${checkedAt}\`
- Validator result: ${input.validation.summary.pass} pass, ${input.validation.summary.warn} warn, ${input.validation.summary.fail} fail

## 中文

### 认证状态

该 beta release 采用 evidence-gated 发布方式。必需 artifact 已由 \`pnpm beta:evidence:check\` 校验；这份公开摘要会截短钱包地址、交易哈希、店铺 URL 和订单标识，避免直接暴露完整认证细节。

| 范围 | 状态 | 证据 |
|------|------|------|
${zhRows.map((row) => `| ${row[0]} | ${row[1]} | ${row[2]} |`).join("\n")}

### 已认证范围

- RedeemLoop beta sandbox stack 可以运行 API、console、Postgres persistence 和独立 webhook worker 服务。
- 目标部署暴露了 API health、persistence、商户 API key、webhook worker recency 和 EVM RPC diagnostics 等 production readiness 信号。
- 已用 RPC receipt 和匹配的 Transfer log 独立核验一笔 funded ERC-20 提货券支付。
- 已通过 RedeemLoop commerce confirmation 将一笔 WooCommerce 测试订单标记为 paid，且不是 dry-run。

### 未声明范围

- 只有当可选 Shopify certification 行显示“通过”时，才声明 Shopify live support。
- Bitcoin Rune、Fractal、inscription 和 NFT 路径仍属于 adapter 或 certification-track support，除非另附 live evidence。
- 这份摘要适合公开发布；完整私有 evidence artifact 保留在本地 evidence 目录。

### 证据元数据

- Release：\`${release}\`
- Manifest：\`${input.manifestPath}\`
- Manifest checked at：\`${input.manifest.checkedAt ?? "not recorded"}\`
- Summary generated at：\`${checkedAt}\`
- Validator result：${input.validation.summary.pass} pass，${input.validation.summary.warn} warn，${input.validation.summary.fail} fail
`;
}

function runEvidenceCheck(manifestPath) {
  const result = spawnSync(process.execPath, ["scripts/check-beta-evidence.mjs", "--manifest", manifestPath, "--json"], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const raw = result.stdout.trim();
  if (!raw) throw new Error(`Evidence validator produced no JSON: ${(result.stderr || "").trim()}`);
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`Evidence validator produced invalid JSON: ${(result.stderr || result.stdout).trim()}`);
  }
}

function summarizeArtifact(artifact) {
  const summary = artifact.summary;
  if (!summary || typeof summary !== "object") return "summary not recorded";
  const pass = Number(summary.pass ?? 0);
  const warn = Number(summary.warn ?? 0);
  const fail = Number(summary.fail ?? 0);
  return `${pass} pass, ${warn} warn, ${fail} fail`;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function parseArgs(argv) {
  const parsed = {
    help: false,
    allowInvalid: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--") continue;
    else if (arg === "--help" || arg === "-h") parsed.help = true;
    else if (arg === "--allow-invalid") parsed.allowInvalid = true;
    else if (arg === "--manifest") parsed.manifest = requireNextValue(argv, ++index, arg);
    else if (arg === "--out") parsed.out = requireNextValue(argv, ++index, arg);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return parsed;
}

function normalizeInput(raw) {
  return {
    manifest: resolve(raw.manifest ?? "evidence/beta-evidence.manifest.json"),
    out: raw.out ? resolve(raw.out) : undefined,
    allowInvalid: raw.allowInvalid,
  };
}

function printHelp() {
  console.log(`RedeemLoop beta release evidence summary

Usage:
  node scripts/create-beta-release-summary.mjs --manifest evidence/beta-evidence.manifest.json --out evidence/RELEASE_BETA.md

Options:
  --manifest PATH    Evidence manifest. Defaults to evidence/beta-evidence.manifest.json.
  --out PATH         Write the bilingual Markdown summary to PATH. Without this flag, prints to stdout.
  --allow-invalid    Generate a diagnostic summary even when non-release-note evidence has failures.

The command generates public-safe bilingual release evidence notes from validated certification artifacts.
It allows the existing releaseNotes artifact to be missing or placeholder because it is meant to create it.
`);
}

function requireNextValue(argv, index, flag) {
  const value = argv[index];
  if (!value) throw new Error(`${flag} requires a value`);
  return value;
}

function stringValue(value) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function titleCase(value) {
  const normalized = stringValue(value) ?? "unknown";
  return normalized.slice(0, 1).toUpperCase() + normalized.slice(1);
}

function shortHash(value) {
  const normalized = stringValue(value);
  if (!normalized || normalized.length <= 14) return normalized ?? "not recorded";
  return `${normalized.slice(0, 8)}...${normalized.slice(-6)}`;
}

function maskIdentifier(value) {
  const normalized = stringValue(String(value));
  if (!normalized) return "redacted";
  if (normalized.length <= 4) return "***";
  return `${normalized.slice(0, 2)}...${normalized.slice(-2)}`;
}

function publicPath(path) {
  const rel = relative(process.cwd(), path);
  if (rel && !rel.startsWith("..") && !rel.startsWith(sep)) return rel.split(sep).join("/");
  return basename(path);
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
