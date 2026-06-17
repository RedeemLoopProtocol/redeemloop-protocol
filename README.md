# RedeemLoop Protocol

RedeemLoop is an FT-first redemption voucher protocol for goods and services.

Languages: [English](#english) | [中文](#中文)

---

## English

Core rule:

```text
1 voucher token = 1 complete redemption right for a specific good or service
```

The first public release is a local EVM prototype and foundation for the roadmap in [docs/ROADMAP.md](docs/ROADMAP.md). It proves the smallest closed loop:

```text
ERC-20 voucher -> user EIP-712 signature -> POS relayer -> burn or collect -> MerchantVault -> commerce mark-as-paid
```

RedeemLoop is not a points system, stored-value balance, discount coupon, marketplace, or NFT-first project. Bitcoin Rune, Fractal Bitcoin, inscription/NFT, marketplace, and KYC adapters are intentionally out of scope for `v0.1.0`.

### What Is Included

- `packages/contracts`: Foundry contracts and tests
  - `RedeemLoopERC20Voucher`
  - `MerchantVault`
  - `StoreTerminalRegistry`
  - `IRedeemLoopVoucher`
- `services/api`: Fastify relayer prototype
  - terminal registration
  - merchant EVM voucher receiving address
  - EIP-712 redemption intent creation
  - signature verification
  - dry-run or transaction submission
  - commerce payment intent and confirmation endpoints
  - Shopify `orderMarkAsPaid` dry-run/live adapter
  - WooCommerce `set_paid` dry-run/live adapter
  - Shopify and WooCommerce HMAC-verified mark-as-paid webhook endpoints
- `apps/pos-verifier`: Next.js POS verifier demo
  - terminal setup
  - EVM ERC-20 voucher payment button
  - merchant receiver setup
  - Shopify/WooCommerce/custom order metadata
  - QR/deep link generation
  - wallet signing
  - relayer submission
  - commerce mark-as-paid confirmation
- `docs` and `whitepaper`: protocol design notes and construction docs

### Requirements

- Node.js 22+
- pnpm 10+
- Foundry 1.7+

### Install

```bash
pnpm install
cd packages/contracts
forge install foundry-rs/forge-std --no-git
cd ../..
```

### Verify

Run the full local release gate:

```bash
pnpm verify
pnpm audit --audit-level moderate
```

Individual commands:

```bash
pnpm lint
pnpm test
pnpm build
pnpm contracts:test
```

### Local Anvil Demo

Terminal 1:

```bash
pnpm anvil
```

Terminal 2:

```bash
export PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
export DEMO_USER=0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266
export TERMINAL_OPERATOR=0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266

forge script packages/contracts/script/DeployPhase0.s.sol:DeployPhase0 \
  --rpc-url http://127.0.0.1:8545 \
  --broadcast
```

The private key above is Anvil's well-known local development key. Never use it on a public network or with real funds.

Terminal 3:

```bash
pnpm api:dev
```

Terminal 4:

```bash
pnpm pos:dev
```

Open `http://localhost:3000`.

Flow:

1. Register the terminal.
2. Paste the deployed voucher token address.
3. Set the merchant receiver address.
4. Enter the commerce provider and order ID.
5. Connect a wallet on Anvil chain `31337`.
6. Click `Pay` to create the EVM voucher payment and commerce intent.
7. Sign the EIP-712 message.
8. Submit it through the relayer.
9. Mark the commerce order as paid.

By default the relayer runs in dry-run mode, which verifies signatures without submitting a transaction. To submit transactions:

```bash
RELAYER_DRY_RUN=false \
RPC_URL=http://127.0.0.1:8545 \
RELAYER_PRIVATE_KEY=0x... \
pnpm api:dev
```

### Contract Model

`RedeemLoopERC20Voucher` is an ERC-20 with:

- `decimals() = 0`
- fixed `maxSupply`
- mint role
- `sealMinting`
- pause control
- immutable `merchantId`
- immutable `termsHash`
- configured `merchantVault`
- configured redemption mode: `BURN` or `COLLECT`
- EIP-712 `collectWithAuthorization`
- EIP-712 `burnWithAuthorization`

`COLLECT` transfers tokens into `MerchantVault`. `BURN` destroys tokens and reduces total supply.

No private customer data is written on-chain. Shipping addresses, phone numbers, names, order notes, and other PII must stay off-chain.

### API Prototype

The relayer exposes:

```http
GET  /health
GET  /v1/config
POST /v1/merchants/:merchantId/receiving-address
GET  /v1/merchants/:merchantId/receiving-address
POST /v1/terminals/register
POST /v1/commerce/payment-intents
POST /v1/commerce/confirm
POST /v1/webhooks/shopify/mark-as-paid
POST /v1/webhooks/woocommerce/mark-as-paid
POST /v1/redemptions/intents
POST /v1/redemptions/submit
```

The relayer never signs for users. It verifies user-signed typed data and either dry-runs the submission or calls the voucher contract with the configured relayer key.

Commerce adapters are dry-run by default. To enable platform writes, set `RELAYER_DRY_RUN=false` and provide the relevant credentials:

```bash
SHOPIFY_SHOP_DOMAIN=your-development-store.myshopify.com
SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_...
SHOPIFY_WEBHOOK_SECRET=...

WOOCOMMERCE_STORE_URL=https://merchant.example
WOOCOMMERCE_CONSUMER_KEY=ck_...
WOOCOMMERCE_CONSUMER_SECRET=cs_...
WOOCOMMERCE_WEBHOOK_SECRET=...
```

### Security Status

This is unaudited prototype code for local development and review. Do not deploy to mainnet or handle real redemption inventory before:

- independent smart contract audit
- legal review for the target jurisdiction
- production vault multisig
- persistent database-backed relayer state
- rate limiting and abuse monitoring
- production key management

See [SECURITY.md](SECURITY.md) and [docs/SECURITY_COMPLIANCE.md](docs/SECURITY_COMPLIANCE.md).

### Documentation

- [Construction](docs/CONSTRUCTION.md)
- [Protocol spec](docs/PROTOCOL_SPEC.md)
- [Contract blueprint](docs/CONTRACT_BLUEPRINT.md)
- [API and data model](docs/API_AND_DATA_MODEL.md)
- [Integration guide](docs/INTEGRATION_GUIDE.md)
- [Roadmap](docs/ROADMAP.md)
- [Whitepaper](whitepaper/RedeemLoop_Whitepaper.md)

### Release

Current release: `v0.1.0`.

Before tagging a release:

```bash
pnpm verify
pnpm audit --audit-level moderate
```

Then follow [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md).

### License

MIT. See [LICENSE](LICENSE).

---

## 中文

RedeemLoop 是一个以 FT（同质化代币）为优先形态的商品与服务兑换券协议。

核心规则：

```text
1 个 voucher token = 1 次完整的特定商品或服务兑换权
```

首个公开版本是一个本地 EVM 原型，也是 [docs/ROADMAP.md](docs/ROADMAP.md) 中路线图的基础。它验证最小闭环：

```text
ERC-20 voucher -> 用户 EIP-712 签名 -> POS relayer -> burn 或 collect -> MerchantVault -> 电商平台标记已支付
```

RedeemLoop 不是积分系统、储值余额、折扣券、 marketplace，也不是 NFT-first 项目。Bitcoin Rune、Fractal Bitcoin、inscription/NFT、marketplace 和 KYC adapter 不包含在 `v0.1.0` 范围内。

### 当前包含内容

- `packages/contracts`：Foundry 合约与测试
  - `RedeemLoopERC20Voucher`
  - `MerchantVault`
  - `StoreTerminalRegistry`
  - `IRedeemLoopVoucher`
- `services/api`：Fastify relayer 原型
  - 终端注册
  - 商户 EVM 收券地址
  - EIP-712 兑换 intent 创建
  - 签名验证
  - dry-run 或链上交易提交
  - 电商支付 intent 与确认端点
  - Shopify `orderMarkAsPaid` dry-run/live adapter
  - WooCommerce `set_paid` dry-run/live adapter
  - Shopify 与 WooCommerce HMAC 校验 mark-as-paid webhook
- `apps/pos-verifier`：Next.js POS 验券演示
  - 终端配置
  - EVM ERC-20 voucher payment button
  - 商户收券地址配置
  - Shopify/WooCommerce/custom 订单字段
  - QR/deep link 生成
  - 钱包签名
  - relayer 提交
  - 电商订单 mark-as-paid 确认
- `docs` 与 `whitepaper`：协议设计、施工文档与白皮书

### 环境要求

- Node.js 22+
- pnpm 10+
- Foundry 1.7+

### 安装

```bash
pnpm install
cd packages/contracts
forge install foundry-rs/forge-std --no-git
cd ../..
```

### 验证

运行完整本地发布门禁：

```bash
pnpm verify
pnpm audit --audit-level moderate
```

单独命令：

```bash
pnpm lint
pnpm test
pnpm build
pnpm contracts:test
```

### 本地 Anvil 演示

终端 1：

```bash
pnpm anvil
```

终端 2：

```bash
export PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
export DEMO_USER=0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266
export TERMINAL_OPERATOR=0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266

forge script packages/contracts/script/DeployPhase0.s.sol:DeployPhase0 \
  --rpc-url http://127.0.0.1:8545 \
  --broadcast
```

上面的私钥是 Anvil 本地开发默认私钥。不要在公链或真实资金环境使用。

终端 3：

```bash
pnpm api:dev
```

终端 4：

```bash
pnpm pos:dev
```

打开 `http://localhost:3000`。

流程：

1. 注册终端。
2. 填入已部署的 voucher token 地址。
3. 设置商户收券地址。
4. 填入电商平台 provider 与订单 ID。
5. 在 Anvil chain `31337` 连接钱包。
6. 点击 `Pay` 创建 EVM voucher payment 与 commerce intent。
7. 签署 EIP-712 消息。
8. 通过 relayer 提交。
9. 将电商订单标记为已支付。

默认情况下 relayer 运行在 dry-run 模式，只验证签名，不提交链上交易。若要提交交易：

```bash
RELAYER_DRY_RUN=false \
RPC_URL=http://127.0.0.1:8545 \
RELAYER_PRIVATE_KEY=0x... \
pnpm api:dev
```

### 合约模型

`RedeemLoopERC20Voucher` 是一个 ERC-20，具备：

- `decimals() = 0`
- 固定 `maxSupply`
- mint role
- `sealMinting`
- pause control
- 不可变 `merchantId`
- 不可变 `termsHash`
- 已配置 `merchantVault`
- 已配置兑换模式：`BURN` 或 `COLLECT`
- EIP-712 `collectWithAuthorization`
- EIP-712 `burnWithAuthorization`

`COLLECT` 会把 token 转入 `MerchantVault`。`BURN` 会销毁 token 并减少总供应量。

链上不写入任何用户隐私数据。收货地址、电话号码、姓名、订单备注和其他 PII 必须留在链下。

### API 原型

Relayer 暴露：

```http
GET  /health
GET  /v1/config
POST /v1/merchants/:merchantId/receiving-address
GET  /v1/merchants/:merchantId/receiving-address
POST /v1/terminals/register
POST /v1/commerce/payment-intents
POST /v1/commerce/confirm
POST /v1/webhooks/shopify/mark-as-paid
POST /v1/webhooks/woocommerce/mark-as-paid
POST /v1/redemptions/intents
POST /v1/redemptions/submit
```

Relayer 不会替用户签名。它只验证用户签署的 typed data，并根据配置执行 dry-run 或使用 relayer key 调用 voucher 合约。

电商 adapter 默认 dry-run。若要启用平台写入，需要设置 `RELAYER_DRY_RUN=false` 并提供对应凭据：

```bash
SHOPIFY_SHOP_DOMAIN=your-development-store.myshopify.com
SHOPIFY_ADMIN_ACCESS_TOKEN=shpat_...
SHOPIFY_WEBHOOK_SECRET=...

WOOCOMMERCE_STORE_URL=https://merchant.example
WOOCOMMERCE_CONSUMER_KEY=ck_...
WOOCOMMERCE_CONSUMER_SECRET=cs_...
WOOCOMMERCE_WEBHOOK_SECRET=...
```

### 安全状态

这是未经审计的原型代码，仅用于本地开发与评审。在满足以下条件前，不要部署到主网或处理真实兑换库存：

- 独立智能合约审计
- 目标司法辖区法律审查
- 生产 vault 多签
- 基于持久化数据库的 relayer 状态
- 限流与滥用监控
- 生产级密钥管理

参见 [SECURITY.md](SECURITY.md) 与 [docs/SECURITY_COMPLIANCE.md](docs/SECURITY_COMPLIANCE.md)。

### 文档

- [Construction](docs/CONSTRUCTION.md)
- [Protocol spec](docs/PROTOCOL_SPEC.md)
- [Contract blueprint](docs/CONTRACT_BLUEPRINT.md)
- [API and data model](docs/API_AND_DATA_MODEL.md)
- [Integration guide](docs/INTEGRATION_GUIDE.md)
- [Roadmap](docs/ROADMAP.md)
- [Whitepaper](whitepaper/RedeemLoop_Whitepaper.md)

### 发布

当前版本：`v0.1.0`。

打标签发布前：

```bash
pnpm verify
pnpm audit --audit-level moderate
```

然后按 [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) 执行。

### 许可证

MIT。参见 [LICENSE](LICENSE)。
