# RedeemLoop Public Merchant Sandbox

## English

RedeemLoop v0.3.0 adds a public merchant sandbox path for developers who want to run the Phase 0 voucher payment gateway locally.

### What Runs

- Fastify API at `http://localhost:8787`.
- Phase 0 console and demo store at `http://localhost:3000`.
- File-backed sandbox state in a Docker volume or `.redeemloop/state.json`.
- Merchant API key example: `merchant_cafe` / `dev-secret`.

### Docker Quick Start

```bash
docker compose up --build
```

Open:

```text
http://localhost:3000
http://localhost:3000/demo-store
http://localhost:8787/health
```

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

```bash
curl "http://localhost:8787/v1/webhook-deliveries?merchantId=merchant_cafe" \
  -H "Authorization: Bearer dev-secret"
```

```bash
curl -X POST "http://localhost:8787/v1/webhook-deliveries/whd_xxx/attempt" \
  -H "Authorization: Bearer dev-secret"
```

### Production Checklist Before Pilots

- Replace file-backed persistence with a managed database.
- Replace explicit delivery attempts with a managed worker queue.
- Configure merchant-specific API keys.
- Configure strict `REDEEMLOOP_EMBED_ALLOWED_ORIGINS`.
- Configure `RPC_URL` and `EVM_MIN_CONFIRMATIONS` for trusted EVM settlement.
- Keep `RELAYER_DRY_RUN=true` until commerce credentials and settlement verification are ready.

## 中文

RedeemLoop v0.3.0 新增 public merchant sandbox 路径，方便开发者在本地运行 Phase 0 提货券支付网关。

### 会运行什么

- Fastify API：`http://localhost:8787`。
- Phase 0 控制台和 demo store：`http://localhost:3000`。
- Docker volume 或 `.redeemloop/state.json` 中的文件型 sandbox 状态。
- 商户 API key 示例：`merchant_cafe` / `dev-secret`。

### Docker 快速开始

```bash
docker compose up --build
```

打开：

```text
http://localhost:3000
http://localhost:3000/demo-store
http://localhost:8787/health
```

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

```bash
curl "http://localhost:8787/v1/webhook-deliveries?merchantId=merchant_cafe" \
  -H "Authorization: Bearer dev-secret"
```

```bash
curl -X POST "http://localhost:8787/v1/webhook-deliveries/whd_xxx/attempt" \
  -H "Authorization: Bearer dev-secret"
```

### Pilot 前生产检查

- 把文件型持久化替换为托管数据库。
- 把显式 delivery attempt 替换为托管 worker queue。
- 配置商户专属 API key。
- 配置严格的 `REDEEMLOOP_EMBED_ALLOWED_ORIGINS`。
- 配置 `RPC_URL` 和 `EVM_MIN_CONFIRMATIONS`，用于可信 EVM settlement。
- 在 commerce credentials 和 settlement verification 准备好之前，保持 `RELAYER_DRY_RUN=true`。
