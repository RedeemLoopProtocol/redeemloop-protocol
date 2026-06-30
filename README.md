# RedeemLoop Protocol

[English](README.md) | [中文](README.zh-CN.md)

RedeemLoop is a non-issuing, multi-chain voucher payment gateway.

Merchants bring their own existing FT, NFT, Rune, or Inscription voucher assets. RedeemLoop binds those assets to goods or services, creates a `PaymentIntent`, confirms that the merchant received the voucher asset on-chain or through an indexer, and tells the commerce system to mark the order as paid.

```text
Existing voucher asset
        ->
Asset Binding
        ->
Voucher Tender button / POS QR / hosted payment link
        ->
PaymentIntent
        ->
Transfer to merchant receiving address
        ->
Receipt confirmation
        ->
Commerce mark-as-paid
```

## v0.2 Phase 0 Scope

This release fixes the first public implementation scope:

- Asset Binding model and validators.
- Voucher Tender flow for an existing voucher asset.
- PaymentIntent state machine and API.
- EVM ERC-20 transfer request calldata for wallet payment buttons.
- EVM ERC-20 balance check request for wallet holding checks.
- EVM Multi-Chain Wallet Beta for Ethereum, BNB Smart Chain, Polygon PoS, and Arbitrum One through injected EIP-1193 wallets.
- EVM Live Certification console and merchant-facing wallet error taxonomy for ETH/BSC/Polygon/Arbitrum pilot runs.
- Merchant Embed Alpha with SDK methods, React Pay Button, script-tag widget, and demo store page.
- File-backed sandbox persistence and merchant-scoped API key enforcement for local/pilot environments.
- Snapshot-backed Postgres persistence through `REDEEMLOOP_DATABASE_URL` for beta deployment hardening.
- Trusted EVM ERC-20 settlement recheck from transaction receipts.
- WooCommerce sandbox payment gateway plugin.
- Webhook event outbox, standalone worker process, signed delivery attempts, lease-based processing state, retry state, dead-letter status, and replay API.
- Phase 0 hardening with signed EVM vault ownership challenge, PaymentIntent expiration cleanup, audit logs, and webhook worker drain endpoint.
- Merchant Admin pilot console with vaults, bindings, PaymentIntents, webhooks, delivery records, audit logs, and pilot seed data.
- Shopify private-app mark-as-paid alpha with configuration diagnostics, mocked Admin API tests, and GraphQL user-error handling.
- Rune production certification track with indexer failover adapter boundary and manual-review recovery for indexer lag.
- Fractal and Inscription/NFT adapter alpha boundaries with mocked ownership and transfer proof tests.
- POS QR and livestream short-link pilot APIs backed by PaymentIntent reconciliation.
- Hosted Payment Page Alpha for token-scoped POS QR and short-link checkout URLs.
- Official Website and Scenario Model for GitHub Pages, with bilingual project positioning, merchant scenarios, readiness status, and custom-domain guidance.
- Public Merchant Sandbox with Docker Compose, `.env.example`, environment checks, and API reference docs.
- Bitcoin Rune Wallet/Indexer Beta adapter surface with UniSat `sendRunes`, Xverse `runes_transfer`, Xverse API-backed Rune balance/UTXO/activity verification, API-level Rune settlement recheck, and a clearly labeled PSBT request fixture boundary.
- Merchant receiving address / vault confirmation model.
- Settlement proof submission and idempotency.
- WooCommerce, Shopify, and custom mark-as-paid adapter surface.
- React/Next local console for Asset Binding, PaymentIntent, receipt proof, and mark-as-paid demo.
- Adapter interfaces for EVM, Bitcoin PSBT, wallet, and indexer integrations.

## Protocol Boundary

RedeemLoop does:

- Register an existing voucher asset descriptor.
- Bind that asset to an entitlement, SKU, receiving address, and settlement policy.
- Create payment buttons, checkout flows, POS QR links, hosted payment pages, or short links.
- Help wallets transfer the required asset to the merchant receiving address.
- Verify receipt through chain events or indexers.
- Notify commerce systems that an order is paid.

RedeemLoop does not:

- Issue tokens or provide a token launch tool.
- Deploy merchant token contracts.
- Etch Runes, inscribe Ordinals, or mint NFTs.
- Custody merchant assets or private keys.
- Design tokenomics, pricing, or secondary markets.
- Replace commerce, inventory, logistics, tax, or after-sales systems.
- Depend on commerce-order workarounds or delivery-system replacement language.

## Current Implementation

```text
packages/core      Protocol types, validators, PaymentIntent state machine
packages/adapters  EVM, Bitcoin Rune wallet/indexer adapters, wallet error taxonomy, PSBT fixture boundary, and shared adapter interfaces
packages/sdk       TypeScript API client
packages/react     React provider and Pay Button for merchant embeds
packages/widget    Script-tag widget for non-React merchant stores
packages/contracts EVM ERC-20 voucher example contracts only
services/api       Fastify API for bindings, intents, proofs, webhooks, commerce adapters
apps/pos-verifier  Local Phase 0 console, hosted payment pages, POS-style QR demo, demo store page, EVM live certification console, and merchant admin console
apps/site          Static bilingual official website and merchant scenario model for GitHub Pages
plugins/woocommerce WooCommerce sandbox payment gateway plugin
docs/              v0.2 protocol, boundary, API, integration, and construction docs
whitepaper/        v0.2 whitepaper source and rendered files
```

The Solidity package is kept as an EVM example for projects that already use ERC-20 voucher assets. It is not a RedeemLoop asset issuance module.

## Quick Start

Requirements:

- Node.js 22+
- pnpm 10+
- Foundry, only for the EVM example contract tests

```bash
pnpm install
pnpm verify
```

Run the API:

```bash
pnpm api:dev
```

Optional managed persistence and merchant API keys:

```bash
REDEEMLOOP_DATABASE_URL=postgres://redeemloop:redeemloop@localhost:5432/redeemloop \
REDEEMLOOP_API_KEYS="merchant_cafe:dev-secret" \
pnpm api:dev
```

`REDEEMLOOP_DATABASE_URL` enables snapshot-backed Postgres persistence for merchants, vaults, entitlements, bindings, PaymentIntents, settlement proofs, idempotency keys, webhook endpoints, webhook events, webhook delivery records, public payment sessions, and commerce payment records. Run `services/api/migrations/001_api_snapshots.sql` when managing schema outside the app startup path. `REDEEMLOOP_STORAGE_FILE=.redeemloop/state.json` remains available as a local sandbox fallback.
`REDEEMLOOP_API_KEYS` accepts comma-separated `merchantId:apiKey` entries or a JSON object string. When configured, merchant-scoped `/v1` API calls must include `Authorization: Bearer <apiKey>`.

Public merchant sandbox:

```bash
cp .env.example .env
pnpm env:check
docker compose up --build
```

Open `http://localhost:3000` for the console and `http://localhost:3002/health` for the API health check.

Docker Compose also starts the webhook worker. For non-Docker local runs, start it after the API:

```bash
REDEEMLOOP_API_BASE_URL=http://localhost:3002 \
REDEEMLOOP_WORKER_MERCHANT_ID=merchant_cafe \
REDEEMLOOP_WORKER_API_KEY=dev-secret \
pnpm --filter @redeemloop/api worker:dev
```

Beta readiness evidence:

```bash
REDEEMLOOP_API_BASE_URL=http://localhost:3002 \
REDEEMLOOP_MERCHANT_ID=merchant_cafe \
REDEEMLOOP_API_KEY=dev-secret \
pnpm beta:check
```

For production-style gates, use `pnpm beta:check:production`. See [Beta Readiness Checks](docs/BETA_READINESS.md).

Trusted EVM settlement recheck can be enabled with:

```bash
RPC_URL=https://base-mainnet.example \
EVM_MIN_CONFIRMATIONS=2 \
pnpm api:dev
```

After a wallet broadcasts a transfer, call `POST /v1/payment-intents/:intentId/broadcasted` with the tx hash, then `POST /v1/settlement/evm/recheck/:intentId`. The API reads the transaction receipt, verifies an ERC-20 `Transfer(payer, merchantVault, requiredAmount)` log, and only then creates a trusted settlement proof.

Run the local Phase 0 console:

```bash
pnpm pos:dev
```

Open `http://localhost:3000`, keep the API at `http://localhost:3002`, then run:

1. Create Asset Binding.
2. Create PaymentIntent.
3. Check Balance.
4. Request Transfer.
5. Confirm Receipt.
6. Review the dry-run mark-as-paid adapter output.

For hosted checkout testing, use the POS console to create a POS QR or short link with `Short Base URL` set to the running payment app, for example `http://localhost:3000`. Open the generated `/pay/:intentId?token=...` or `/s/:slug?token=...` URL in a wallet-enabled browser. The hosted page uses token-scoped public session APIs, so customers do not need the merchant API key.

Run the official website locally:

```bash
pnpm site:dev
```

Open `http://localhost:3001`. The static website is published from `apps/site` and can be deployed through GitHub Pages. See [docs/WEBSITE_AND_PAGES.md](docs/WEBSITE_AND_PAGES.md) for Pages setup and the optional `redeemloop.aifund.com` custom-domain path.

For EVM ERC-20 voucher assets, `Request Transfer` returns a wallet-ready `transfer(merchantVault, requiredAmount)` transaction request with contract address, calldata, chain ID, and `value: 0x0`.
`Check Balance` returns a wallet-ready `balanceOf(payer)` call request and, when a balance is supplied, evaluates whether the payer holds enough voucher assets.

Open `http://localhost:3000/demo-store` for the merchant embed demo. The page seeds a demo merchant binding, then shows both:

- `@redeemloop/react` with `RedeemLoopProvider` and `RedeemLoopPayButton`.
- `@redeemloop/widget` mounted into a normal DOM node for script-tag style stores.

React embed example:

```tsx
import { RedeemLoopPayButton, RedeemLoopProvider } from "@redeemloop/react";

export function ProductCheckout() {
  return (
    <RedeemLoopProvider baseUrl="https://api.example.com">
      <RedeemLoopPayButton
        bindingId="bind_merchant_cafe_coffee_cup"
        orderId="ORDER-1001"
        channel="checkout"
        skuLines={[{ sku: "coffee-cup", quantity: 1 }]}
        payerAddress="0xPayer"
        balance="1"
      />
    </RedeemLoopProvider>
  );
}
```

Script widget example:

```html
<div
  data-redeemloop-pay-button
  data-api-base-url="https://api.example.com"
  data-binding-id="bind_merchant_cafe_coffee_cup"
  data-order-id="ORDER-1001"
  data-sku="coffee-cup"
  data-payer-address="0xPayer"
  data-balance="1"
></div>
<script type="module" src="/redeemloop-widget.js"></script>
```

## API Surface

Core v0.2 endpoints:

```text
POST /v1/merchants
GET  /v1/merchants/:merchantId
POST /v1/merchant-vaults
GET  /v1/merchant-vaults?merchantId=...
POST /v1/entitlements
GET  /v1/entitlements/:entitlementId
POST /v1/bindings
GET  /v1/bindings/:bindingId
POST /v1/payment-intents
GET  /v1/payment-intents/:intentId
POST /v1/payment-intents/:intentId/connect-wallet
POST /v1/payment-intents/:intentId/select-asset
POST /v1/payment-intents/:intentId/check-balance
POST /v1/payment-intents/:intentId/transfer-requested
POST /v1/payment-intents/:intentId/broadcasted
GET  /v1/public/short-links/:slug?checkoutToken=...
GET  /v1/public/payment-sessions/:intentId?checkoutToken=...
POST /v1/public/payment-sessions/:intentId/connect-wallet
POST /v1/public/payment-sessions/:intentId/transfer-requested
POST /v1/public/payment-sessions/:intentId/broadcasted
POST /v1/public/payment-sessions/:intentId/settlement/evm/recheck
POST /v1/settlement/proofs
POST /v1/settlement/evm/recheck/:intentId
POST /v1/webhook-endpoints
POST /v1/webhook-endpoints/:id/test
GET  /v1/webhook-events?merchantId=...
GET  /v1/webhook-events/:eventId
GET  /v1/webhook-deliveries?merchantId=...
GET  /v1/webhook-deliveries/:deliveryId
GET  /v1/diagnostics/webhooks?merchantId=...
POST /v1/webhook-deliveries/drain-pending
POST /v1/webhook-deliveries/:deliveryId/attempt
POST /v1/webhook-deliveries/:deliveryId/replay
```

## WooCommerce Sandbox Plugin

The sandbox plugin lives in `plugins/woocommerce/redeemloop-voucher-gateway.php`.

Install it into a test WordPress shop:

```text
wp-content/plugins/redeemloop-voucher-gateway/redeemloop-voucher-gateway.php
```

Then enable **RedeemLoop Voucher** in WooCommerce payment settings and configure API Base URL, Merchant ID, API Key, Default Binding ID, Webhook Secret, and optional widget script URL.

Webhook endpoint:

```text
POST /wp-json/redeemloop/v1/woocommerce/mark-paid
```

## Webhook Delivery Operations

When a `PaymentIntent` reaches `paid`, the API writes a `payment_intent.paid` webhook event and one delivery record for each matching active merchant endpoint. Delivery requests use:

```text
X-RedeemLoop-Event-Id
X-RedeemLoop-Delivery-Id
X-RedeemLoop-Timestamp
X-RedeemLoop-Nonce
X-RedeemLoop-Signature = hex(hmac_sha256(secret, timestamp + "." + nonce + "." + rawBody))
```

Merchants can inspect and operate delivery records through:

```text
GET  /v1/webhook-events?merchantId=...
GET  /v1/webhook-deliveries?merchantId=...
GET  /v1/diagnostics/webhooks?merchantId=...
POST /v1/webhook-deliveries/drain-pending
POST /v1/webhook-deliveries/:deliveryId/attempt
POST /v1/webhook-deliveries/:deliveryId/replay
```

This operations layer can now be backed by Postgres snapshot persistence, drained by a standalone worker with delivery leases, and inspected through webhook diagnostics. Production deployments still need external monitoring/alert routing and live wallet/commerce certification before beta claims.

Legacy v0.1 relayer routes remain in code only as compatibility test coverage. New integrations should use the v0.2 Asset Binding and PaymentIntent API.

## PaymentIntent States

```text
created
wallet_connected
asset_selected
transfer_requested
broadcasted
seen
confirmed
paid
expired
failed
cancelled
manual_review
```

`paid`, `expired`, `failed`, and `cancelled` are terminal states. Settlement proof confirmation advances the intent through receipt confirmation and mark-as-paid idempotency.

## Documents

- [Protocol Boundary](docs/BOUNDARY.md)
- [Construction Guide](docs/CONSTRUCTION.md)
- [Protocol Spec](docs/PROTOCOL_SPEC.md)
- [Integration Guide](docs/INTEGRATION_GUIDE.md)
- [Public Merchant Sandbox](docs/PUBLIC_SANDBOX.md)
- [EVM Multi-Chain Wallet Beta](docs/EVM_MULTI_CHAIN_WALLET.md)
- [EVM Live Certification Runbook](docs/EVM_LIVE_CERTIFICATION.md)
- [Merchant Admin and WooCommerce Pilot](docs/MERCHANT_ADMIN_WOOCOMMERCE_PILOT.md)
- [Shopify Mark-as-Paid Adapter Alpha](docs/SHOPIFY_ADAPTER_ALPHA.md)
- [Rune Production Certification Track](docs/RUNE_CERTIFICATION_TRACK.md)
- [Fractal and Inscription/NFT Adapter Alpha](docs/FRACTAL_INSCRIPTION_ALPHA.md)
- [POS QR and Short-Link Pilot](docs/POS_QR_SHORT_LINK_PILOT.md)
- [Bitcoin Rune Alpha](docs/BITCOIN_RUNE_ALPHA.md)
- [Bitcoin Rune Real-Usability Plan](docs/BITCOIN_RUNE_REAL_USABILITY.md)
- [API Reference](docs/API_REFERENCE.md)
- [Commerce Adapters](docs/COMMERCE_ADAPTERS.md)
- [API and Data Model](docs/API_AND_DATA_MODEL.md)
- [Security and Compliance](docs/SECURITY_COMPLIANCE.md)
- [Whitepaper](whitepaper/RedeemLoop_Whitepaper.md)

---

# RedeemLoop Protocol / 兑环协议

RedeemLoop 是一个非发行型、多链提货券支付网关。

商户自带已经存在的 FT、NFT、Rune 或 Inscription 提货资产。RedeemLoop 负责把这些资产绑定到商品或服务权益，创建 `PaymentIntent`，确认商户已经在链上或索引器中收到提货资产，然后通知电商系统把订单标记为已付款。

```text
已有提货资产
        ->
Asset Binding
        ->
Voucher Tender 按钮 / POS QR / hosted payment link
        ->
PaymentIntent
        ->
转入商户收券地址
        ->
收券确认
        ->
电商 mark-as-paid
```

## v0.2 Phase 0 范围

第一版公开实现范围固定为：

- Asset Binding 模型与校验。
- 针对已有提货资产的 Voucher Tender 流程。
- PaymentIntent 状态机与 API。
- EVM ERC-20 钱包支付按钮所需的 transfer calldata。
- EVM ERC-20 持券检测所需的 balanceOf call request。
- EVM Multi-Chain Wallet Beta：通过注入式 EIP-1193 钱包支持 Ethereum、BNB Smart Chain、Polygon PoS 和 Arbitrum One。
- EVM Live Certification console 和面向商户的钱包错误分类，用于 ETH/BSC/Polygon/Arbitrum pilot run。
- Merchant Embed Alpha：SDK 方法、React Pay Button、script-tag widget 和 demo store 页面。
- 文件持久化 sandbox 和商户级 API key 校验，适用于本地和 pilot 环境。
- 基于 transaction receipt 的可信 EVM ERC-20 settlement recheck。
- WooCommerce sandbox payment gateway plugin。
- Webhook event outbox、独立 worker 进程、签名投递、基于 lease 的 processing 状态、重试状态、dead-letter 状态和 replay API。
- Phase 0 hardening：EVM vault ownership 签名 challenge、PaymentIntent 过期清理、audit logs 和 webhook worker drain endpoint。
- Merchant Admin pilot console：支持 vaults、bindings、PaymentIntents、webhooks、delivery records、audit logs 和 pilot seed data。
- Shopify private-app mark-as-paid alpha：包含配置诊断、mocked Admin API tests 和 GraphQL user-error 处理。
- Rune production certification track：包含 indexer failover adapter boundary 和 indexer lag manual-review recovery。
- Fractal 和 Inscription/NFT adapter alpha boundaries：包含 mocked ownership 和 transfer proof tests。
- POS QR 和直播短链 pilot APIs：回到 PaymentIntent reconciliation 主线。
- Hosted Payment Page Alpha：支持带 token 的 POS QR 和短链 checkout URL。
- Public Merchant Sandbox：Docker Compose、`.env.example`、环境检查和 API reference 文档。
- Bitcoin Rune Wallet/Indexer Beta adapter surface：UniSat `sendRunes`、Xverse `runes_transfer`、基于 Xverse API 的 Rune balance/UTXO/activity 校验、API-level Rune settlement recheck，以及明确标注的 PSBT request fixture 边界。
- 商户收券地址 / vault 确认模型。
- Settlement proof 提交与幂等。
- WooCommerce、Shopify、自定义 mark-as-paid 适配表面。
- 用于本地演示的 React/Next 控制台：Asset Binding、PaymentIntent、收券 proof、mark-as-paid。
- EVM、Bitcoin PSBT、钱包、索引器 adapter interfaces。

## 协议边界

RedeemLoop 做：

- 登记已有链上提货资产描述符。
- 绑定资产、商品权益、SKU、收券地址和结算策略。
- 生成商品页按钮、结账流程、POS QR、hosted payment page 或短链。
- 引导钱包把指定资产转入商户收券地址。
- 通过链上事件或索引器确认收券。
- 通知电商系统订单已付款。

RedeemLoop 不做：

- 不发行 token，不提供发币工具。
- 不部署商户 token 合约。
- 不 etch Rune，不 inscribe Ordinal，不 mint NFT。
- 不托管商户资产或私钥。
- 不设计 tokenomics、定价或二级市场。
- 不替代电商、库存、物流、税务或售后系统。
- 不依赖电商订单绕行方案或替代交付系统的叙事。

## 当前实现

```text
packages/core      协议类型、校验器、PaymentIntent 状态机
packages/adapters  EVM、Bitcoin Rune 钱包/索引器 adapters、钱包错误分类、PSBT fixture 边界和通用 adapter interfaces
packages/sdk       TypeScript API client
packages/react     面向商户嵌入的 React provider 和 Pay Button
packages/widget    面向非 React 店铺的 script-tag widget
packages/contracts EVM ERC-20 提货资产示例合约
services/api       binding、intent、proof、webhook、电商适配 API
apps/pos-verifier  本地 Phase 0 控制台、hosted payment pages、POS QR 演示、demo store 页面、EVM live certification console 和 merchant admin console
docs/              v0.2 协议、边界、API、集成和施工文档
whitepaper/        v0.2 白皮书源码和渲染文件
```

Solidity 包只作为 EVM ERC-20 提货资产示例保留，不是 RedeemLoop 的资产发行模块。

## 快速开始

要求：

- Node.js 22+
- pnpm 10+
- Foundry，仅用于 EVM 示例合约测试

```bash
pnpm install
pnpm verify
```

运行 API：

```bash
pnpm api:dev
```

运行本地 Phase 0 控制台：

```bash
pnpm pos:dev
```

打开 `http://localhost:3000`，API 保持在 `http://localhost:3002`，然后按顺序运行：

1. Create Asset Binding。
2. Create PaymentIntent。
3. Check Balance。
4. Request Transfer。
5. Confirm Receipt。
6. 查看 dry-run mark-as-paid 适配输出。

测试 hosted checkout 时，可以在 POS console 里创建 POS QR 或短链，并把 `Short Base URL` 设置成正在运行的支付页面地址，例如 `http://localhost:3000`。然后在支持钱包的浏览器打开生成的 `/pay/:intentId?token=...` 或 `/s/:slug?token=...` URL。Hosted page 使用 token-scoped public session API，用户不需要商户 API key。

对于 EVM ERC-20 提货资产，`Request Transfer` 会返回钱包可直接使用的 `transfer(merchantVault, requiredAmount)` 交易请求，包括合约地址、calldata、chain ID 和 `value: 0x0`。
`Check Balance` 会返回钱包可直接使用的 `balanceOf(payer)` call request；如果传入余额，也会判断付款地址是否持有足够提货资产。

## API 表面

v0.2 核心端点：

```text
POST /v1/merchants
GET  /v1/merchants/:merchantId
POST /v1/merchant-vaults
GET  /v1/merchant-vaults?merchantId=...
POST /v1/entitlements
GET  /v1/entitlements/:entitlementId
POST /v1/bindings
GET  /v1/bindings/:bindingId
POST /v1/payment-intents
GET  /v1/payment-intents/:intentId
POST /v1/payment-intents/:intentId/check-balance
POST /v1/payment-intents/:intentId/transfer-requested
POST /v1/payment-intents/:intentId/broadcasted
GET  /v1/public/short-links/:slug?checkoutToken=...
GET  /v1/public/payment-sessions/:intentId?checkoutToken=...
POST /v1/public/payment-sessions/:intentId/connect-wallet
POST /v1/public/payment-sessions/:intentId/transfer-requested
POST /v1/public/payment-sessions/:intentId/broadcasted
POST /v1/public/payment-sessions/:intentId/settlement/evm/recheck
POST /v1/settlement/proofs
POST /v1/webhook-endpoints
POST /v1/webhook-endpoints/:id/test
GET  /v1/webhook-events?merchantId=...
GET  /v1/webhook-events/:eventId
GET  /v1/webhook-deliveries?merchantId=...
GET  /v1/webhook-deliveries/:deliveryId
GET  /v1/diagnostics/webhooks?merchantId=...
POST /v1/webhook-deliveries/drain-pending
POST /v1/webhook-deliveries/:deliveryId/attempt
POST /v1/webhook-deliveries/:deliveryId/replay
```

## Webhook 投递运维

当 `PaymentIntent` 进入 `paid` 状态时，API 会写入一个 `payment_intent.paid` webhook event，并为每个匹配的 active 商户 endpoint 创建 delivery record。投递请求使用：

```text
X-RedeemLoop-Event-Id
X-RedeemLoop-Delivery-Id
X-RedeemLoop-Timestamp
X-RedeemLoop-Nonce
X-RedeemLoop-Signature = hex(hmac_sha256(secret, timestamp + "." + nonce + "." + rawBody))
```

商户可以通过以下 API 查询和操作 delivery：

```text
GET  /v1/webhook-events?merchantId=...
GET  /v1/webhook-deliveries?merchantId=...
GET  /v1/diagnostics/webhooks?merchantId=...
POST /v1/webhook-deliveries/drain-pending
POST /v1/webhook-deliveries/:deliveryId/attempt
POST /v1/webhook-deliveries/:deliveryId/replay
```

该运维层现在可以使用 Postgres snapshot 持久化，由带 delivery lease 的独立 worker drain，并通过 webhook diagnostics 检查。生产部署在 beta 声明前仍需要外部监控/告警路由，以及真实钱包/电商认证。

旧 v0.1 relayer 路由仅作为兼容测试保留。新集成应使用 v0.2 Asset Binding 和 PaymentIntent API。

## PaymentIntent 状态

```text
created
wallet_connected
asset_selected
transfer_requested
broadcasted
seen
confirmed
paid
expired
failed
cancelled
manual_review
```

`paid`、`expired`、`failed`、`cancelled` 是终态。收券 proof 确认后会推进 PaymentIntent，并通过幂等 key 触发 mark-as-paid。

## 文档

- [协议边界](docs/BOUNDARY.md)
- [施工文档](docs/CONSTRUCTION.md)
- [协议规格](docs/PROTOCOL_SPEC.md)
- [集成指南](docs/INTEGRATION_GUIDE.md)
- [Public Merchant Sandbox](docs/PUBLIC_SANDBOX.md)
- [EVM Multi-Chain Wallet Beta](docs/EVM_MULTI_CHAIN_WALLET.md)
- [EVM Live Certification Runbook](docs/EVM_LIVE_CERTIFICATION.md)
- [Merchant Admin and WooCommerce Pilot](docs/MERCHANT_ADMIN_WOOCOMMERCE_PILOT.md)
- [Shopify Mark-as-Paid Adapter Alpha](docs/SHOPIFY_ADAPTER_ALPHA.md)
- [Rune Production Certification Track](docs/RUNE_CERTIFICATION_TRACK.md)
- [Fractal and Inscription/NFT Adapter Alpha](docs/FRACTAL_INSCRIPTION_ALPHA.md)
- [POS QR and Short-Link Pilot](docs/POS_QR_SHORT_LINK_PILOT.md)
- [Bitcoin Rune Alpha](docs/BITCOIN_RUNE_ALPHA.md)
- [Bitcoin Rune Real-Usability Plan](docs/BITCOIN_RUNE_REAL_USABILITY.md)
- [API Reference](docs/API_REFERENCE.md)
- [电商适配](docs/COMMERCE_ADAPTERS.md)
- [API 与数据模型](docs/API_AND_DATA_MODEL.md)
- [安全与合规](docs/SECURITY_COMPLIANCE.md)
- [白皮书](whitepaper/RedeemLoop_Whitepaper.md)
