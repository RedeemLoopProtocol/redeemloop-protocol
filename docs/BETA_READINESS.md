# RedeemLoop Beta Readiness Checks

## English

`pnpm beta:check` collects deployment evidence before a beta release or pilot run. It does not certify a real wallet, a real store, or a live commerce flow by itself; it verifies that the deployed API exposes the minimum operational signals needed before those certification runs.

For the end-to-end GitHub UI sequence after these checks are understood, use the [Beta Operator Runbook](BETA_OPERATOR_RUNBOOK.md).

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

### Production Readiness Workflow

Set the GitHub repository secret `REDEEMLOOP_EVM_RPC_URLS` before running **Beta Production Readiness Evidence**. Use the same format as `EVM_RPC_URLS`, for example a JSON object keyed by EVM chain ID. Do not commit RPC URLs that contain provider API keys.

The workflow starts the Docker Compose stack with Postgres, API, worker, and console, injects `EVM_RPC_URLS` into the API service, runs `pnpm --silent beta:smoke:compose -- --keep-up --json`, runs `pnpm --silent beta:check:production -- --json`, validates both JSON reports, stops Docker Compose, and uploads `beta-readiness-production.json` plus a fresh `compose-smoke.json` as `redeemloop-production-readiness-evidence`.

Download `beta-readiness-production.json` into `evidence/beta-readiness-production.json` before running the beta evidence manifest validator. This workflow proves production-readiness signals for the configured runner environment; it is not a substitute for funded wallet or live store certification.

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

If part of the local evidence folder already contains real artifacts but the manifest or another placeholder is missing, restore only missing files without overwriting existing evidence:

```bash
pnpm beta:evidence:init -- --missing-only
```

Use `--force` only when you intentionally want to replace every local evidence file with fresh placeholders.

After GitHub evidence workflows complete, download selected artifacts by workflow run ID. The command replaces scaffold placeholders but refuses to overwrite existing non-placeholder evidence unless `--force` is passed:

```bash
pnpm beta:evidence:download -- \
  --compose-run-id <compose_smoke_run_id> \
  --production-run-id <production_readiness_run_id> \
  --evm-run-id <evm_workflow_run_id> \
  --woocommerce-run-id <woocommerce_workflow_run_id>
```

Required evidence for a production-certified beta claim:

- Docker Compose smoke JSON from `pnpm --silent beta:smoke:compose -- --json`.
- Production readiness JSON from `pnpm --silent beta:check:production -- --json`.
- Funded EVM wallet certification JSON with chain ID, wallet name/version, PaymentIntent ID, transaction hash, payer, receiver, ERC-20 contract, amount, receipt status, confirmations, and timestamp.
- WooCommerce mark-as-paid certification JSON with provider, store URL, order ID, PaymentIntent ID, chain ID, merchant ID, voucher token, amount, receiver, transaction hash, live non-dry-run mark-paid status, and timestamp.
- Beta release notes.

Shopify certification is optional unless the beta release claims Shopify live support.

The required EVM and WooCommerce artifacts must describe the same payment. The beta evidence validator compares PaymentIntent ID, chain ID, transaction hash, ERC-20 voucher token, receiver, and raw amount across the two artifacts before release notes can be generated.

### Release Preflight

Use the release preflight while replacing evidence placeholders. It summarizes which artifacts are ready, which required artifacts still block publication, and the next operator actions:

```bash
pnpm beta:release:preflight -- \
  --manifest evidence/beta-evidence.manifest.json
```

Add `--github --repo RedeemLoopProtocol/redeemloop-protocol` to verify that the required GitHub repository secret names exist. The preflight is read-only: it does not send wallet transactions, call commerce adapters, or read secret values. It is an operator checklist, not a substitute for the final release gate.

The same check can be run from GitHub Actions with **Beta Release Preflight Evidence**. The workflow initializes a local evidence manifest on the runner, optionally downloads evidence artifacts from the run IDs you provide through `pnpm beta:evidence:download`, verifies that required repository secrets are injected, runs `pnpm beta:release:preflight`, and uploads `beta-release-preflight.json` as `redeemloop-beta-release-preflight`. A failing preflight run is expected until funded EVM, WooCommerce, and release-note artifacts are present.

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

The same check can be run from GitHub Actions with **Beta EVM Wallet Certification Evidence**. Configure `REDEEMLOOP_EVM_RPC_URLS`, run the workflow manually with the real chain ID, wallet name/version, PaymentIntent ID, transaction hash, payer, merchant vault, ERC-20 contract, and amount, then download `evm-wallet-certification.json` into `evidence/evm-wallet-certification.json`.

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

The command calls `/v1/commerce/confirm` and expects a live `paid` result. Dry-run artifacts are rejected by the beta evidence validator. The generated artifact preserves the settlement identity fields so the release gate can prove the WooCommerce order was marked paid from the same EVM transaction recorded in `evm-wallet-certification.json`.

The same WooCommerce certification can be run from GitHub Actions with **Beta WooCommerce Certification Evidence**. Configure `REDEEMLOOP_COMMERCE_CERTIFICATION_API_KEY` with a merchant API key for the target RedeemLoop API, run the workflow manually with the live test-store order and settlement fields, then download `woocommerce-certification.json` into `evidence/woocommerce-certification.json`. The workflow is intentionally WooCommerce-specific because WooCommerce is required for the first beta claim; Shopify remains optional unless live Shopify support is claimed.

### Public Evidence Summary

After the real evidence artifacts are in place, generate a public-safe bilingual evidence summary for the release notes artifact:

```bash
pnpm --silent beta:evidence:summary -- \
  --manifest evidence/beta-evidence.manifest.json \
  --out evidence/RELEASE_BETA.md
```

The command validates all non-release-note artifacts before writing the summary. It redacts wallet addresses, transaction hashes, store URLs, and order identifiers by default, so the generated Markdown can be copied into a GitHub Release without exposing the private evidence files.

The `--out` path must match `manifest.artifacts.releaseNotes.path` unless `--allow-output-mismatch` is explicitly passed for diagnostics.

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

`beta:version:prepare` is dry-run by default. Add `--write` only after external evidence is real and the beta release tag is chosen. The release gate reruns evidence validation, checks that release notes contain separate English and Chinese sections, rejects placeholder text, checks for obvious secret-like material and unredacted EVM addresses or transaction hashes, verifies README beta-readiness links, checks CI/Pages/compose-smoke/production-readiness/EVM/WooCommerce evidence workflow presence, verifies active pnpm workspace overrides, runs a frozen lockfile check, and confirms all workspace package versions match the release tag when `--require-version-match` is set.

The same final gate can be reproduced from GitHub Actions with **Beta Release Gate Evidence** after the version commit is prepared. Provide the release tag plus the completed compose-smoke, production-readiness, funded EVM, and WooCommerce certification workflow run IDs. The workflow downloads those artifacts, generates `RELEASE_BETA.md`, runs `pnpm beta:release:gate`, and uploads `beta-release-gate.json` plus the generated public release notes.

## 中文

`pnpm beta:check` 用于在 beta release 或 pilot run 前采集部署证据。它本身不等于真实钱包、真实店铺或 live commerce flow 已认证；它只验证部署中的 API 是否已经暴露真实认证前所需的最低运维信号。

理解这些检查后，如需按 GitHub UI 完成完整发布操作，请使用 [Beta Operator Runbook](BETA_OPERATOR_RUNBOOK.md)。

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

### Production Readiness Workflow

运行 **Beta Production Readiness Evidence** 前，先在 GitHub 仓库 secret 中设置 `REDEEMLOOP_EVM_RPC_URLS`。格式与 `EVM_RPC_URLS` 相同，例如以 EVM chain ID 为 key 的 JSON object。不要把包含 provider API key 的 RPC URL 提交进仓库。

该 workflow 会启动包含 Postgres、API、worker 和 console 的 Docker Compose stack，把 `EVM_RPC_URLS` 注入 API service，运行 `pnpm --silent beta:smoke:compose -- --keep-up --json`，再运行 `pnpm --silent beta:check:production -- --json`，校验两个 JSON report，停止 Docker Compose，并把 `beta-readiness-production.json` 和新的 `compose-smoke.json` 上传为 `redeemloop-production-readiness-evidence`。

运行 beta evidence manifest validator 前，把 `beta-readiness-production.json` 下载到 `evidence/beta-readiness-production.json`。该 workflow 证明的是当前 runner 环境的 production-readiness signals；它不能替代 funded wallet 或 live store certification。

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

如果本地 evidence 目录中已经有真实 artifact，但 manifest 或某个占位文件丢失，可以只恢复缺失文件，不覆盖已有 evidence：

```bash
pnpm beta:evidence:init -- --missing-only
```

只有在你明确要用全新的占位文件替换所有本地 evidence 时，才使用 `--force`。

GitHub evidence workflow 完成后，可以按 workflow run ID 下载指定 artifact。该命令会替换 scaffold placeholder；如果目标文件已经是非 placeholder evidence，默认拒绝覆盖，除非显式传入 `--force`：

```bash
pnpm beta:evidence:download -- \
  --compose-run-id <compose_smoke_run_id> \
  --production-run-id <production_readiness_run_id> \
  --evm-run-id <evm_workflow_run_id> \
  --woocommerce-run-id <woocommerce_workflow_run_id>
```

Production-certified beta 声明所需证据：

- `pnpm --silent beta:smoke:compose -- --json` 生成的 Docker Compose smoke JSON。
- `pnpm --silent beta:check:production -- --json` 生成的 production readiness JSON。
- Funded EVM wallet certification JSON，包含 chain ID、钱包名称/版本、PaymentIntent ID、transaction hash、payer、receiver、ERC-20 contract、amount、receipt status、confirmations 和时间戳。
- WooCommerce mark-as-paid certification JSON，包含 provider、store URL、order ID、PaymentIntent ID、chain ID、merchant ID、voucher token、amount、receiver、transaction hash、真实非 dry-run mark-paid status 和时间戳。
- Beta release notes。

除非 beta release 声明 Shopify live support，否则 Shopify certification 是可选项。

必需的 EVM artifact 和 WooCommerce artifact 必须描述同一笔支付。Beta evidence validator 会在生成 release notes 前，对比两个 artifact 中的 PaymentIntent ID、chain ID、transaction hash、ERC-20 voucher token、receiver 和 raw amount。

### Release Preflight

替换 evidence placeholder 的过程中，可以用 release preflight 汇总哪些 artifact 已经就绪、哪些必需 artifact 仍阻断发布，以及下一步操作：

```bash
pnpm beta:release:preflight -- \
  --manifest evidence/beta-evidence.manifest.json
```

加入 `--github --repo RedeemLoopProtocol/redeemloop-protocol` 后，可以检查必需的 GitHub repository secret 名称是否存在。Preflight 是只读检查：不发送钱包交易，不调用 commerce adapter，也不读取 secret 值。它是操作员 checklist，不能替代最终 release gate。

同样的检查也可以通过 GitHub Actions 的 **Beta Release Preflight Evidence** 运行。该 workflow 会在 runner 上初始化本地 evidence manifest，根据你提供的 run ID 通过 `pnpm beta:evidence:download` 可选下载 evidence artifacts，检查必需 repository secrets 是否已注入，运行 `pnpm beta:release:preflight`，并把 `beta-release-preflight.json` 作为 `redeemloop-beta-release-preflight` 上传。只要 funded EVM、WooCommerce 和 release-note artifacts 还没就位，preflight workflow 失败就是预期状态。

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

同样的检查也可以通过 GitHub Actions 的 **Beta EVM Wallet Certification Evidence** 运行。先配置 `REDEEMLOOP_EVM_RPC_URLS`，再手动运行 workflow，填入真实 chain ID、钱包名称/版本、PaymentIntent ID、交易哈希、付款地址、商户 vault、ERC-20 contract 和 amount，然后把 `evm-wallet-certification.json` 下载到 `evidence/evm-wallet-certification.json`。

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

该命令会调用 `/v1/commerce/confirm`，并要求返回真实 `paid` 结果。Dry-run artifact 会被 beta evidence validator 拒绝。生成的 artifact 会保留 settlement identity 字段，使 release gate 能证明 WooCommerce 订单是由 `evm-wallet-certification.json` 中同一笔 EVM 交易完成标记 paid。

同样的 WooCommerce certification 可以通过 GitHub Actions 的 **Beta WooCommerce Certification Evidence** 运行。先把目标 RedeemLoop API 的 merchant API key 配置到 `REDEEMLOOP_COMMERCE_CERTIFICATION_API_KEY`，再手动运行 workflow，填入 live test-store order 和 settlement 字段，然后把 `woocommerce-certification.json` 下载到 `evidence/woocommerce-certification.json`。该 workflow 故意限定为 WooCommerce，因为首个 beta 必须覆盖 WooCommerce；除非声明 Shopify live support，否则 Shopify 仍是可选证据。

### 公开证据摘要

真实 evidence artifact 就位后，生成适合公开发布的双语 evidence summary，作为 release notes artifact：

```bash
pnpm --silent beta:evidence:summary -- \
  --manifest evidence/beta-evidence.manifest.json \
  --out evidence/RELEASE_BETA.md
```

该命令会在写入 summary 前校验所有非 release-note artifact。默认会截短钱包地址、交易哈希、店铺 URL 和订单标识，因此生成的 Markdown 可以放入 GitHub Release，而不直接暴露完整私有 evidence 文件。

除非显式传入 `--allow-output-mismatch` 做诊断输出，否则 `--out` 路径必须与 `manifest.artifacts.releaseNotes.path` 一致。

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

`beta:version:prepare` 默认是 dry-run。只有在外部证据真实齐备、beta release tag 已确定后，才添加 `--write`。该 release gate 会重新运行 evidence validation，检查 release notes 是否包含独立 English 和中文章节，拒绝占位文本，检查明显 secret-like material 以及未脱敏的 EVM 地址或交易哈希，确认 README beta-readiness 链接，检查 CI/Pages/compose-smoke/production-readiness/EVM/WooCommerce evidence workflow 是否存在，确认 pnpm workspace overrides 处于有效配置位置，运行 frozen lockfile 检查，并在设置 `--require-version-match` 时确认所有 workspace package version 与 release tag 一致。

版本提交准备好后，也可以通过 GitHub Actions 的 **Beta Release Gate Evidence** 复现最终 gate。输入 release tag，以及已完成的 compose-smoke、production-readiness、funded EVM 和 WooCommerce certification workflow run IDs。该 workflow 会下载这些 artifacts，生成 `RELEASE_BETA.md`，运行 `pnpm beta:release:gate`，并上传 `beta-release-gate.json` 和生成的公开 release notes。
