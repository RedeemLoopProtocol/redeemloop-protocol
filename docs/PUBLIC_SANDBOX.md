# RedeemLoop Public Merchant Sandbox

## English

RedeemLoop v0.3.0 added a public merchant sandbox path for developers who want to run the Phase 0 voucher payment gateway locally. v0.10.0 updates the Docker path to use Postgres snapshot persistence by default.
v0.10.1 adds a separate webhook worker service for draining due delivery records.

### What Runs

- Fastify API at `http://localhost:3002`.
- Phase 0 console and demo store at `http://localhost:3000`.
- Webhook worker service that drains due deliveries through the API.
- Snapshot-backed Postgres state in Docker Compose; `.redeemloop/state.json` remains available for local fallback runs.
- Merchant API key example: `merchant_cafe` / `dev-secret`.

### Docker Quick Start

```bash
docker compose up --build
```

Open:

```text
http://localhost:3000
http://localhost:3000/demo-store
http://localhost:3002/health
```

### Docker Smoke

```bash
pnpm beta:smoke:compose
```

The smoke command verifies API health, console HTTP readiness, Postgres-backed persistence, and webhook worker heartbeat. It uses only host ports `3000` and `3002`.

If Docker is unavailable locally, run the **Beta Compose Smoke Evidence** GitHub Actions workflow and download its `redeemloop-compose-smoke-evidence` artifact.

### Local Quick Start

```bash
cp .env.example .env
set -a
. ./.env
set +a
pnpm install
pnpm env:check
pnpm api:dev
```

In another terminal:

```bash
pnpm pos:dev
```

### Merchant Flow

1. Create or seed a merchant.
2. Create a merchant vault / receiving address.
3. Create an entitlement.
4. Create an Asset Binding for an existing voucher asset.
5. Create a PaymentIntent from the console, React button, widget, or SDK.
6. Check balance and request a wallet transfer.
7. Submit a sandbox proof or call trusted EVM receipt recheck.
8. Inspect commerce mark-as-paid output.
9. Inspect webhook events and deliveries.

### Webhook Operations

Docker Compose starts the worker automatically. For a local non-Docker run, start it after the API:

```bash
REDEEMLOOP_API_BASE_URL=http://localhost:3002 \
REDEEMLOOP_WORKER_MERCHANT_ID=merchant_cafe \
REDEEMLOOP_WORKER_API_KEY=dev-secret \
pnpm --filter @redeemloop/api worker:dev
```

```bash
curl "http://localhost:3002/v1/webhook-deliveries?merchantId=merchant_cafe" \
  -H "Authorization: Bearer dev-secret"
```

```bash
curl "http://localhost:3002/v1/diagnostics/webhooks?merchantId=merchant_cafe" \
  -H "Authorization: Bearer dev-secret"
```

```bash
curl -X POST "http://localhost:3002/v1/webhook-deliveries/whd_xxx/attempt" \
  -H "Authorization: Bearer dev-secret"
```

### Production Checklist Before Pilots

- Use managed Postgres persistence through `REDEEMLOOP_DATABASE_URL`; split the snapshot into normalized tables before production scale.
- Run the webhook worker as a separate process and route webhook diagnostics into external monitoring/alerts.
- Run `pnpm beta:check:production` against the deployed API and archive `--json` output as pilot evidence.
- Configure merchant-specific API keys.
- Configure strict `REDEEMLOOP_EMBED_ALLOWED_ORIGINS`.
- Keep API rate limiting enabled and tune `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` for the pilot traffic profile.
- Configure `RPC_URL` and `EVM_MIN_CONFIRMATIONS` for trusted EVM settlement.
- Keep `RELAYER_DRY_RUN=true` until commerce credentials and settlement verification are ready.

## 中文

RedeemLoop v0.3.0 新增 public merchant sandbox 路径，方便开发者在本地运行 Phase 0 提货券支付网关。v0.10.0 将 Docker 路径默认更新为 Postgres snapshot 持久化。v0.10.1 新增独立 webhook worker 服务，用于 drain 到期 delivery record。

### 会运行什么

- Fastify API：`http://localhost:3002`。
- Phase 0 控制台和 demo store：`http://localhost:3000`。
- Webhook worker 服务：通过 API drain 到期 delivery。
- Docker Compose 中基于 Postgres snapshot 的状态；`.redeemloop/state.json` 仍可用于本地 fallback。
- 商户 API key 示例：`merchant_cafe` / `dev-secret`。

### Docker 快速开始

```bash
docker compose up --build
```

打开：

```text
http://localhost:3000
http://localhost:3000/demo-store
http://localhost:3002/health
```

### Docker Smoke

```bash
pnpm beta:smoke:compose
```

该 smoke 命令会验证 API health、console HTTP readiness、Postgres persistence 和 webhook worker heartbeat。宿主机只使用 `3000` 和 `3002`。

如果本机没有 Docker，可以运行 **Beta Compose Smoke Evidence** GitHub Actions workflow，并下载其 `redeemloop-compose-smoke-evidence` artifact。

### 本地快速开始

```bash
cp .env.example .env
set -a
. ./.env
set +a
pnpm install
pnpm env:check
pnpm api:dev
```

另开一个终端：

```bash
pnpm pos:dev
```

### 商户流程

1. 创建或 seed merchant。
2. 创建 merchant vault / 收券地址。
3. 创建 entitlement。
4. 为已有提货资产创建 Asset Binding。
5. 通过控制台、React button、widget 或 SDK 创建 PaymentIntent。
6. 检查余额并请求钱包转账。
7. 提交 sandbox proof，或调用可信 EVM receipt recheck。
8. 查看 commerce mark-as-paid 输出。
9. 查看 webhook events 和 deliveries。

### Webhook 运维

Docker Compose 会自动启动 worker。非 Docker 本地运行时，可在 API 启动后运行：

```bash
REDEEMLOOP_API_BASE_URL=http://localhost:3002 \
REDEEMLOOP_WORKER_MERCHANT_ID=merchant_cafe \
REDEEMLOOP_WORKER_API_KEY=dev-secret \
pnpm --filter @redeemloop/api worker:dev
```

```bash
curl "http://localhost:3002/v1/webhook-deliveries?merchantId=merchant_cafe" \
  -H "Authorization: Bearer dev-secret"
```

```bash
curl "http://localhost:3002/v1/diagnostics/webhooks?merchantId=merchant_cafe" \
  -H "Authorization: Bearer dev-secret"
```

```bash
curl -X POST "http://localhost:3002/v1/webhook-deliveries/whd_xxx/attempt" \
  -H "Authorization: Bearer dev-secret"
```

### Pilot 前生产检查

- 通过 `REDEEMLOOP_DATABASE_URL` 使用托管 Postgres 持久化；生产规模前应把 snapshot 拆成规范化表。
- 将 webhook worker 作为独立进程运行，并把 webhook diagnostics 接入外部监控/告警。
- 对已部署 API 运行 `pnpm beta:check:production`，并归档 `--json` 输出作为 pilot evidence。
- 配置商户专属 API key。
- 配置严格的 `REDEEMLOOP_EMBED_ALLOWED_ORIGINS`。
- 保持 API rate limiting 开启，并按 pilot traffic profile 调整 `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX`。
- 配置 `RPC_URL` 和 `EVM_MIN_CONFIRMATIONS`，用于可信 EVM settlement。
- 在 commerce credentials 和 settlement verification 准备好之前，保持 `RELAYER_DRY_RUN=true`。
