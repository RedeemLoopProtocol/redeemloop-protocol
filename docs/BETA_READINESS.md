# RedeemLoop Beta Readiness Checks

## English

`pnpm beta:check` collects deployment evidence before a beta release or pilot run. It does not certify a real wallet, a real store, or a live commerce flow by itself; it verifies that the deployed API exposes the minimum operational signals needed before those certification runs.

### Local Sandbox

Start the API, then run a one-shot worker drain so the webhook heartbeat exists:

```bash
REDEEMLOOP_API_BASE_URL=http://localhost:3002 \
REDEEMLOOP_WORKER_MERCHANT_ID=merchant_cafe \
REDEEMLOOP_WORKER_API_KEY=dev-secret \
REDEEMLOOP_WORKER_ONCE=true \
pnpm --filter @redeemloop/api worker
```

Then run:

```bash
REDEEMLOOP_API_BASE_URL=http://localhost:3002 \
REDEEMLOOP_MERCHANT_ID=merchant_cafe \
REDEEMLOOP_API_KEY=dev-secret \
pnpm beta:check
```

### Production-style Gate

```bash
REDEEMLOOP_API_BASE_URL=https://api.example.com \
REDEEMLOOP_MERCHANT_ID=merchant_cafe \
REDEEMLOOP_API_KEY=replace-me \
pnpm beta:check:production
```

`beta:check:production` requires Postgres persistence, merchant API keys, explicit non-wildcard embed origins, API rate limiting, a recent webhook worker drain, and at least one healthy EVM RPC diagnostic. Add `--include-docker` when checking the local Docker Compose path.

### Docker Compose Smoke

On a Docker-enabled machine, run:

```bash
pnpm beta:smoke:compose
```

The command starts Docker Compose, waits for the API at `http://127.0.0.1:3002`, waits for the console at `http://127.0.0.1:3000`, verifies `persistence.kind: "postgres"`, verifies a recent webhook worker heartbeat, prints a report, then runs `docker compose down` by default. Use `--keep-up` to leave services running, or `--json` to archive the result.

If the local machine does not have Docker, run the **Beta Compose Smoke Evidence** GitHub Actions workflow manually. It builds the workspace on an Ubuntu runner, runs `pnpm --silent beta:smoke:compose -- --json`, validates that the output is JSON, and uploads `compose-smoke.json` as a workflow artifact. Download that artifact into `evidence/compose-smoke.json` before running the beta evidence manifest validator.

### Checks

- `GET /health`
- `GET /v1/config`
- `GET /v1/diagnostics/webhooks?merchantId=...`
- `GET /v1/diagnostics/evm-rpc`
- `GET /v1/diagnostics/shopify`
- Optional `docker compose config`

### Output

The command prints `PASS`, `WARN`, and `FAIL` lines. `FAIL` exits non-zero. Use `--json` to archive the result as release evidence.

### Rate Limits and CORS

The API rate-limits `/v1/*` requests by bearer token or client IP. Defaults are `RATE_LIMIT_WINDOW_MS=60000` and `RATE_LIMIT_MAX=300`. Production env checks fail if `RATE_LIMIT_DISABLED=true` or if `REDEEMLOOP_EMBED_ALLOWED_ORIGINS=*`. Runtime `/v1/config` exposes `cors` and `rateLimit` diagnostics for beta readiness evidence.

### Evidence Manifest

Before publishing a beta release, initialize a local evidence folder, replace every placeholder with real external artifacts, then validate the manifest:

```bash
pnpm beta:evidence:init
pnpm beta:evidence:check -- --manifest evidence/beta-evidence.manifest.json
```

The generated `evidence/` directory is ignored by Git by default because certification artifacts can contain store URLs, order IDs, wallet addresses, transaction hashes, and deployment metadata. The scaffold intentionally contains failing placeholder artifacts; it cannot pass release validation until real outputs replace them.

Required evidence for a production-certified beta claim:

- Docker Compose smoke JSON from `pnpm --silent beta:smoke:compose -- --json`.
- Production readiness JSON from `pnpm --silent beta:check:production -- --json`.
- Funded EVM wallet certification JSON with chain ID, wallet name/version, PaymentIntent ID, transaction hash, payer, receiver, ERC-20 contract, amount, receipt status, confirmations, and timestamp.
- WooCommerce mark-as-paid certification JSON with provider, store URL, order ID, PaymentIntent ID, live non-dry-run mark-paid status, and timestamp.
- Beta release notes.

Shopify certification is optional unless the beta release claims Shopify live support.

### Funded EVM Evidence

After a real wallet broadcasts an ERC-20 voucher transfer, generate the EVM certification artifact from a read-only RPC receipt check:

```bash
pnpm --silent beta:evidence:evm -- \
  --chain-id 1 \
  --rpc-url https://rpc.example \
  --wallet-name "MetaMask" \
  --wallet-version "11.0.0" \
  --intent-id pi_example \
  --tx-hash 0x... \
  --from 0xPayer \
  --to 0xMerchantVault \
  --contract 0xVoucherToken \
  --amount 1 \
  --out evidence/evm-wallet-certification.json
```

The command does not send transactions or handle private keys. It calls `eth_chainId`, `eth_getTransactionReceipt`, and `eth_blockNumber`, then verifies chain ID, success status, confirmations, sender, ERC-20 contract, receiver, and Transfer amount.

### Commerce Evidence

After settlement is confirmed, generate WooCommerce or Shopify mark-as-paid evidence through the RedeemLoop API:

```bash
pnpm --silent beta:evidence:commerce -- \
  --api-base-url https://api.example.com \
  --api-key merchant-api-key \
  --provider woocommerce \
  --store-url https://store.example \
  --order-id 1001 \
  --intent-id pi_example \
  --chain-id 1 \
  --merchant-id merchant_cafe \
  --voucher-token 0xVoucherToken \
  --amount 1 \
  --receiver 0xMerchantVault \
  --tx-hash 0x... \
  --out evidence/woocommerce-certification.json
```

The command calls `/v1/commerce/confirm` and expects a live `paid` result. Dry-run artifacts are rejected by the beta evidence validator.

### Public Evidence Summary

After the real evidence artifacts are in place, generate a public-safe bilingual evidence summary for the release notes artifact:

```bash
pnpm --silent beta:evidence:summary -- \
  --manifest evidence/beta-evidence.manifest.json \
  --out evidence/RELEASE_BETA.md
```

The command validates all non-release-note artifacts before writing the summary. It redacts wallet addresses, transaction hashes, store URLs, and order identifiers by default, so the generated Markdown can be copied into a GitHub Release without exposing the private evidence files.

### Release Gate

After all evidence artifacts are real and the release notes are final, run the combined beta release gate:

```bash
pnpm beta:version:prepare -- --release v0.10.x-beta.0
pnpm beta:version:prepare -- --release v0.10.x-beta.0 --write
pnpm beta:release:gate -- \
  --manifest evidence/beta-evidence.manifest.json \
  --release v0.10.x-beta.0 \
  --require-version-match
```

`beta:version:prepare` is dry-run by default. Add `--write` only after external evidence is real and the beta release tag is chosen. The release gate reruns evidence validation, checks that release notes contain separate English and Chinese sections, rejects placeholder text, checks for obvious secret-like material, verifies README beta-readiness links, checks CI/Pages/compose-smoke evidence workflow presence, verifies active pnpm workspace overrides, runs a frozen lockfile check, and confirms all workspace package versions match the release tag when `--require-version-match` is set.

## 中文

`pnpm beta:check` 用于在 beta release 或 pilot run 前采集部署证据。它本身不等于真实钱包、真实店铺或 live commerce flow 已认证；它只验证部署中的 API 是否已经暴露真实认证前所需的最低运维信号。

### 本地 Sandbox

先启动 API，再运行一次 one-shot worker drain，让 webhook heartbeat 存在：

```bash
REDEEMLOOP_API_BASE_URL=http://localhost:3002 \
REDEEMLOOP_WORKER_MERCHANT_ID=merchant_cafe \
REDEEMLOOP_WORKER_API_KEY=dev-secret \
REDEEMLOOP_WORKER_ONCE=true \
pnpm --filter @redeemloop/api worker
```

然后运行：

```bash
REDEEMLOOP_API_BASE_URL=http://localhost:3002 \
REDEEMLOOP_MERCHANT_ID=merchant_cafe \
REDEEMLOOP_API_KEY=dev-secret \
pnpm beta:check
```

### 生产式 Gate

```bash
REDEEMLOOP_API_BASE_URL=https://api.example.com \
REDEEMLOOP_MERCHANT_ID=merchant_cafe \
REDEEMLOOP_API_KEY=replace-me \
pnpm beta:check:production
```

`beta:check:production` 要求 Postgres persistence、商户 API key、明确且非 wildcard 的 embed origins、API rate limiting、最近的 webhook worker drain，以及至少一个健康的 EVM RPC diagnostic。检查本地 Docker Compose 路径时，可加 `--include-docker`。

### Docker Compose Smoke

在有 Docker 的机器上运行：

```bash
pnpm beta:smoke:compose
```

该命令会启动 Docker Compose，等待 `http://127.0.0.1:3002` 的 API、等待 `http://127.0.0.1:3000` 的 console，验证 `persistence.kind: "postgres"`，验证最近的 webhook worker heartbeat，输出报告，然后默认执行 `docker compose down`。使用 `--keep-up` 可以保留服务运行，使用 `--json` 可以归档结果。

如果本机没有 Docker，可以手动运行 **Beta Compose Smoke Evidence** GitHub Actions workflow。它会在 Ubuntu runner 上构建 workspace，运行 `pnpm --silent beta:smoke:compose -- --json`，校验输出是 JSON，并把 `compose-smoke.json` 上传为 workflow artifact。下载该 artifact 到 `evidence/compose-smoke.json` 后，再运行 beta evidence manifest validator。

### 检查项

- `GET /health`
- `GET /v1/config`
- `GET /v1/diagnostics/webhooks?merchantId=...`
- `GET /v1/diagnostics/evm-rpc`
- `GET /v1/diagnostics/shopify`
- 可选 `docker compose config`

### 输出

命令会输出 `PASS`、`WARN` 和 `FAIL`。出现 `FAIL` 时会以非零状态退出。使用 `--json` 可以把结果归档为 release evidence。

### Rate Limits and CORS

API 会按 bearer token 或客户端 IP 对 `/v1/*` 请求做 rate limit。默认值是 `RATE_LIMIT_WINDOW_MS=60000` 和 `RATE_LIMIT_MAX=300`。Production env check 会在 `RATE_LIMIT_DISABLED=true` 或 `REDEEMLOOP_EMBED_ALLOWED_ORIGINS=*` 时失败。Runtime `/v1/config` 会暴露 `cors` 和 `rateLimit` diagnostics，供 beta readiness evidence 使用。

### Evidence Manifest

发布 beta 前，先初始化本地 evidence 目录，替换所有占位 artifact，再校验 manifest：

```bash
pnpm beta:evidence:init
pnpm beta:evidence:check -- --manifest evidence/beta-evidence.manifest.json
```

默认生成的 `evidence/` 目录会被 Git 忽略，因为 certification artifact 可能包含店铺 URL、订单 ID、钱包地址、交易哈希和部署元数据。脚手架会故意生成失败状态的占位 artifact；只有替换为真实输出后，release validation 才可能通过。

Production-certified beta 声明所需证据：

- `pnpm --silent beta:smoke:compose -- --json` 生成的 Docker Compose smoke JSON。
- `pnpm --silent beta:check:production -- --json` 生成的 production readiness JSON。
- Funded EVM wallet certification JSON，包含 chain ID、钱包名称/版本、PaymentIntent ID、transaction hash、payer、receiver、ERC-20 contract、amount、receipt status、confirmations 和时间戳。
- WooCommerce mark-as-paid certification JSON，包含 provider、store URL、order ID、PaymentIntent ID、真实非 dry-run mark-paid status 和时间戳。
- Beta release notes。

除非 beta release 声明 Shopify live support，否则 Shopify certification 是可选项。

### Funded EVM Evidence

真实钱包广播 ERC-20 提货券转账后，用只读 RPC receipt check 生成 EVM certification artifact：

```bash
pnpm --silent beta:evidence:evm -- \
  --chain-id 1 \
  --rpc-url https://rpc.example \
  --wallet-name "MetaMask" \
  --wallet-version "11.0.0" \
  --intent-id pi_example \
  --tx-hash 0x... \
  --from 0xPayer \
  --to 0xMerchantVault \
  --contract 0xVoucherToken \
  --amount 1 \
  --out evidence/evm-wallet-certification.json
```

该命令不发交易，也不处理私钥。它只调用 `eth_chainId`、`eth_getTransactionReceipt` 和 `eth_blockNumber`，并校验 chain ID、success status、confirmations、sender、ERC-20 contract、receiver 和 Transfer amount。

### Commerce Evidence

Settlement 确认后，通过 RedeemLoop API 生成 WooCommerce 或 Shopify mark-as-paid evidence：

```bash
pnpm --silent beta:evidence:commerce -- \
  --api-base-url https://api.example.com \
  --api-key merchant-api-key \
  --provider woocommerce \
  --store-url https://store.example \
  --order-id 1001 \
  --intent-id pi_example \
  --chain-id 1 \
  --merchant-id merchant_cafe \
  --voucher-token 0xVoucherToken \
  --amount 1 \
  --receiver 0xMerchantVault \
  --tx-hash 0x... \
  --out evidence/woocommerce-certification.json
```

该命令会调用 `/v1/commerce/confirm`，并要求返回真实 `paid` 结果。Dry-run artifact 会被 beta evidence validator 拒绝。

### 公开证据摘要

真实 evidence artifact 就位后，生成适合公开发布的双语 evidence summary，作为 release notes artifact：

```bash
pnpm --silent beta:evidence:summary -- \
  --manifest evidence/beta-evidence.manifest.json \
  --out evidence/RELEASE_BETA.md
```

该命令会在写入 summary 前校验所有非 release-note artifact。默认会截短钱包地址、交易哈希、店铺 URL 和订单标识，因此生成的 Markdown 可以放入 GitHub Release，而不直接暴露完整私有 evidence 文件。

### Release Gate

所有 evidence artifact 都替换为真实结果、release notes 定稿后，运行组合 beta release gate：

```bash
pnpm beta:version:prepare -- --release v0.10.x-beta.0
pnpm beta:version:prepare -- --release v0.10.x-beta.0 --write
pnpm beta:release:gate -- \
  --manifest evidence/beta-evidence.manifest.json \
  --release v0.10.x-beta.0 \
  --require-version-match
```

`beta:version:prepare` 默认是 dry-run。只有在外部证据真实齐备、beta release tag 已确定后，才添加 `--write`。该 release gate 会重新运行 evidence validation，检查 release notes 是否包含独立 English 和中文章节，拒绝占位文本，检查明显 secret-like material，确认 README beta-readiness 链接，检查 CI/Pages/compose-smoke evidence workflow 是否存在，确认 pnpm workspace overrides 处于有效配置位置，运行 frozen lockfile 检查，并在设置 `--require-version-match` 时确认所有 workspace package version 与 release tag 一致。
