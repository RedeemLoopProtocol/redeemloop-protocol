# RedeemLoop Protocol / 兑环协议

[English](README.md) | [中文](README.zh-CN.md)

RedeemLoop 是一个非发行型、多链提货券支付网关。

商户自带已经存在的 FT、NFT、Rune 或 Inscription 提货资产。RedeemLoop 负责把这些资产绑定到商品或服务权益，创建 `PaymentIntent`，确认商户已经在链上或索引器中收到提货资产，然后通知电商系统把订单标记为已付款。

```text
已有提货资产
        ->
Asset Binding
        ->
Voucher Tender 按钮 / POS QR
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
- Merchant Embed Alpha：SDK 方法、React Pay Button、script-tag widget 和 demo store 页面。
- 文件持久化 sandbox 和商户级 API key 校验，适用于本地和 pilot 环境。
- 基于 transaction receipt 的可信 EVM ERC-20 settlement recheck。
- WooCommerce sandbox payment gateway plugin。
- Webhook event outbox、签名投递、重试状态、dead-letter 状态和 replay API。
- Public Merchant Sandbox：Docker Compose、`.env.example`、环境检查和 API reference 文档。
- 商户收券地址 / vault 确认模型。
- Settlement proof 提交与幂等。
- WooCommerce、Shopify、自定义 mark-as-paid 适配表面。
- 用于本地演示的 React/Next 控制台：Asset Binding、PaymentIntent、收券 proof、mark-as-paid。
- EVM、Bitcoin PSBT、钱包、索引器 adapter interfaces。

## 协议边界

RedeemLoop 做：

- 登记已有链上提货资产描述符。
- 绑定资产、商品权益、SKU、收券地址和结算策略。
- 生成商品页按钮、结账流程、POS QR 或短链。
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
packages/adapters  EVM、PSBT、钱包、索引器 adapter interfaces
packages/sdk       TypeScript API client
packages/react     面向商户嵌入的 React provider 和 Pay Button
packages/widget    面向非 React 店铺的 script-tag widget
packages/contracts EVM ERC-20 提货资产示例合约
services/api       binding、intent、proof、webhook、电商适配 API
apps/pos-verifier  本地 Phase 0 控制台、POS QR 演示和 demo store 页面
plugins/woocommerce WooCommerce sandbox payment gateway 插件
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

可选 v0.2.2 sandbox 持久化和商户 API key：

```bash
REDEEMLOOP_STORAGE_FILE=.redeemloop/state.json \
REDEEMLOOP_API_KEYS="merchant_cafe:dev-secret" \
pnpm api:dev
```

`REDEEMLOOP_STORAGE_FILE` 会把 merchant、vault、entitlement、binding、PaymentIntent、settlement proof、幂等 key、webhook endpoint、webhook event、webhook delivery record 和 commerce payment record 持久化到本地文件，API 重启后仍可恢复。它是 sandbox persistence adapter，不是生产数据库替代品。
`REDEEMLOOP_API_KEYS` 支持逗号分隔的 `merchantId:apiKey`，也支持 JSON object 字符串。配置后，商户级 `/v1` API 调用必须携带 `Authorization: Bearer <apiKey>`。

Public merchant sandbox：

```bash
cp .env.example .env
pnpm env:check
docker compose up --build
```

打开 `http://localhost:3000` 查看控制台，打开 `http://localhost:8787/health` 查看 API health check。

可信 EVM settlement recheck 可以这样启用：

```bash
RPC_URL=https://base-mainnet.example \
EVM_MIN_CONFIRMATIONS=2 \
pnpm api:dev
```

钱包广播转账后，先调用 `POST /v1/payment-intents/:intentId/broadcasted` 提交 tx hash，再调用 `POST /v1/settlement/evm/recheck/:intentId`。API 会读取交易 receipt，校验 ERC-20 `Transfer(payer, merchantVault, requiredAmount)` log，然后才创建 trusted settlement proof。

运行本地 Phase 0 控制台：

```bash
pnpm pos:dev
```

打开 `http://localhost:3000`，API 保持在 `http://localhost:8787`，然后按顺序运行：

1. Create Asset Binding。
2. Create PaymentIntent。
3. Check Balance。
4. Request Transfer。
5. Confirm Receipt。
6. 查看 dry-run mark-as-paid 适配输出。

对于 EVM ERC-20 提货资产，`Request Transfer` 会返回钱包可直接使用的 `transfer(merchantVault, requiredAmount)` 交易请求，包括合约地址、calldata、chain ID 和 `value: 0x0`。
`Check Balance` 会返回钱包可直接使用的 `balanceOf(payer)` call request；如果传入余额，也会判断付款地址是否持有足够提货资产。

打开 `http://localhost:3000/demo-store` 可以查看商户嵌入 demo。该页面会先创建演示商户 binding，然后同时展示：

- `@redeemloop/react`：`RedeemLoopProvider` 和 `RedeemLoopPayButton`。
- `@redeemloop/widget`：挂载到普通 DOM 节点的 script-tag 风格 widget。

React 嵌入示例：

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

Script widget 示例：

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
POST /v1/payment-intents/:intentId/connect-wallet
POST /v1/payment-intents/:intentId/select-asset
POST /v1/payment-intents/:intentId/check-balance
POST /v1/payment-intents/:intentId/transfer-requested
POST /v1/payment-intents/:intentId/broadcasted
POST /v1/settlement/proofs
POST /v1/settlement/evm/recheck/:intentId
POST /v1/webhook-endpoints
POST /v1/webhook-endpoints/:id/test
GET  /v1/webhook-events?merchantId=...
GET  /v1/webhook-events/:eventId
GET  /v1/webhook-deliveries?merchantId=...
GET  /v1/webhook-deliveries/:deliveryId
POST /v1/webhook-deliveries/:deliveryId/attempt
POST /v1/webhook-deliveries/:deliveryId/replay
```

## WooCommerce Sandbox 插件

sandbox 插件位于 `plugins/woocommerce/redeemloop-voucher-gateway.php`。

安装到测试 WordPress 店铺：

```text
wp-content/plugins/redeemloop-voucher-gateway/redeemloop-voucher-gateway.php
```

然后在 WooCommerce 支付设置中启用 **RedeemLoop Voucher**，配置 API Base URL、Merchant ID、API Key、Default Binding ID、Webhook Secret 和可选 widget script URL。

Webhook endpoint：

```text
POST /wp-json/redeemloop/v1/woocommerce/mark-paid
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
POST /v1/webhook-deliveries/:deliveryId/attempt
POST /v1/webhook-deliveries/:deliveryId/replay
```

这仍是基于当前 API persistence adapter 的 sandbox 运维层。生产部署应迁移到托管数据库和 worker queue。

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
- [API Reference](docs/API_REFERENCE.md)
- [电商适配](docs/COMMERCE_ADAPTERS.md)
- [API 与数据模型](docs/API_AND_DATA_MODEL.md)
- [安全与合规](docs/SECURITY_COMPLIANCE.md)
- [白皮书](whitepaper/RedeemLoop_Whitepaper.md)
