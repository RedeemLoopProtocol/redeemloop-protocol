# RedeemLoop Integration Guide v0.4.1 / 集成指南 v0.4.1

## English

### 1. Integration Model

RedeemLoop is an external voucher payment gateway. The commerce system still owns product pricing, orders, fulfillment, tax, refunds, and customer support.

RedeemLoop owns only this path:

```text
Asset Binding -> PaymentIntent -> voucher transfer request -> receipt confirmation -> commerce mark-as-paid
```

The merchant brings the voucher asset. RedeemLoop does not issue, mint, etch, inscribe, custody, price, or trade that asset.

### 2. Merchant Setup

1. Create a merchant.
2. Create a merchant vault / receiving address.
3. Create an entitlement for the good or service.
4. Create an Asset Binding that connects accepted voucher assets, entitlement, SKU, store target, settlement policy, and merchant vault.
5. Embed the React Pay Button or script widget.
6. Receive mark-as-paid notifications after settlement confirmation.

For a complete local sandbox, see [Public Merchant Sandbox](PUBLIC_SANDBOX.md). For endpoint-by-endpoint reference, see [API Reference](API_REFERENCE.md).
For Bitcoin Rune wallet/indexer beta support, see [Bitcoin Rune Alpha](BITCOIN_RUNE_ALPHA.md) and [Bitcoin Rune Real-Usability Plan](BITCOIN_RUNE_REAL_USABILITY.md).

### 2.1 Bitcoin Rune Wallet Path

For real merchant Rune integration, prefer wallet-native transfer methods before the server-side PSBT fixture boundary:

- UniSat: call `createUniSatRuneWalletAdapter(window.unisat)` and use `requestRuneTransfer` with `runeId`.
- Xverse: call `createXverseRuneWalletAdapter(request)` and use `requestRuneTransfer` with `runeName`.
- Confirmation: call `createXverseRuneIndexerAdapter` or another `RuneIndexerAdapter` implementation, then submit the resulting proof to `POST /v1/settlement/proofs`.

The `transfer.bitcoin.psbtBase64` API response remains available for adapter integration tests. It is not a production PSBT engine.

### 3. SDK Flow

```ts
import { RedeemLoopClient } from "@redeemloop/sdk";

const client = new RedeemLoopClient("https://api.example.com", "merchant-api-key");

await client.createMerchant({ merchantId: "merchant_cafe", name: "Merchant Cafe" });
await client.createMerchantVault({
  merchantId: "merchant_cafe",
  chainNamespace: "eip155",
  chainId: 8453,
  address: "0xMerchantVault",
});

await client.createEntitlement({
  merchantId: "merchant_cafe",
  entitlementId: "ent_coffee",
  name: "Coffee pickup",
  quantity: 1,
  termsHash: "coffee-terms",
});

await client.createBinding({
  bindingId: "bind_coffee",
  merchantId: "merchant_cafe",
  entitlementId: "ent_coffee",
  acceptedAssets: [
    {
      chainNamespace: "eip155",
      chainId: 8453,
      assetType: "erc20",
      assetId: "eip155:8453/erc20:0xVoucherToken",
      contract: "0xVoucherToken",
      requiredAmount: "1",
      termsHash: "coffee-terms",
    },
  ],
  merchantVaults: {
    "eip155:8453": "0xMerchantVault",
  },
  settlementPolicy: "collect",
  commerceTargets: [{ platform: "woocommerce", storeId: "woo-store", sku: "coffee-cup" }],
  status: "active",
  termsHash: "coffee-terms",
});
```

### 4. React Pay Button

```tsx
import { RedeemLoopPayButton, RedeemLoopProvider } from "@redeemloop/react";

export function Checkout() {
  return (
    <RedeemLoopProvider baseUrl="https://api.example.com" apiKey="merchant-api-key">
      <RedeemLoopPayButton
        bindingId="bind_coffee"
        orderId="ORDER-1001"
        channel="checkout"
        skuLines={[{ sku: "coffee-cup", quantity: 1 }]}
        payerAddress="0xPayer"
        balance="1"
        onComplete={(result) => console.log(result.transfer)}
      />
    </RedeemLoopProvider>
  );
}
```

The alpha button creates a PaymentIntent, optionally checks balance, and returns a wallet-ready transfer request. If `txid` and `autoSubmitProof` are supplied in a sandbox flow, it also submits a settlement proof.

### 5. Script Widget

```html
<div
  data-redeemloop-pay-button
  data-api-base-url="https://api.example.com"
  data-api-key="merchant-api-key"
  data-binding-id="bind_coffee"
  data-order-id="ORDER-1001"
  data-sku="coffee-cup"
  data-payer-address="0xPayer"
  data-balance="1"
></div>
<script type="module" src="/redeemloop-widget.js"></script>
```

The widget emits DOM events:

```text
redeemloop:intent
redeemloop:balance
redeemloop:transfer
redeemloop:broadcasted
redeemloop:paid
redeemloop:error
```

### 6. EVM ERC-20 Payment Request

The API exposes the wallet-facing steps:

```http
POST /v1/payment-intents/:intentId/check-balance
POST /v1/payment-intents/:intentId/transfer-requested
POST /v1/payment-intents/:intentId/broadcasted
POST /v1/settlement/proofs
POST /v1/settlement/evm/recheck/:intentId
```

`check-balance` returns a `balanceOf(payer)` call request. `transfer-requested` returns ERC-20 `transfer(merchantVault, requiredAmount)` calldata with `value: 0x0`.
For trusted EVM settlement, record the broadcast tx hash, then call `settlement/evm/recheck`. The API fetches the receipt through `RPC_URL`, verifies the ERC-20 `Transfer` log, counts confirmations, and creates a trusted proof.

### 7. Embed Origin Controls

For local development, the API allows `http://localhost:3000` and `http://127.0.0.1:3000`.

For merchant deployments, configure:

```bash
REDEEMLOOP_EMBED_ALLOWED_ORIGINS="https://shop.example,https://checkout.example"
```

Verified merchant domains are also accepted by the API CORS policy.

### 8. Sandbox Persistence and API Keys

For local or pilot environments, the API can persist sandbox state to a JSON file:

```bash
REDEEMLOOP_STORAGE_FILE=.redeemloop/state.json pnpm api:dev
```

The file-backed adapter persists merchants, vaults, entitlements, bindings, PaymentIntents, settlement proofs, idempotency keys, webhook endpoints, webhook events, webhook delivery records, and commerce payment records. It is useful for restarts and pilot demos, but production deployments should still move to a managed database.

Merchant-scoped API key enforcement can be enabled with:

```bash
REDEEMLOOP_API_KEYS="merchant_cafe:dev-secret,merchant_shop:shop-secret"
```

or:

```bash
REDEEMLOOP_API_KEYS='{"merchant_cafe":"dev-secret"}'
```

When API keys are configured, merchant-scoped `/v1` requests must include:

```http
Authorization: Bearer dev-secret
```

### 9. WooCommerce and Shopify

v0.4.1 includes the sandbox WooCommerce payment gateway plugin at:

```text
plugins/woocommerce/redeemloop-voucher-gateway.php
```

WooCommerce should be implemented first as a native payment gateway plugin:

```text
Checkout payment method -> RedeemLoop Pay Button/widget -> settlement confirmation -> payment_complete
```

The plugin provides:

- WooCommerce payment method registration.
- Admin settings for API Base URL, Merchant ID, API Key, Default Binding ID, Webhook Secret, and optional widget script URL.
- PaymentIntent creation during checkout.
- Order-received widget container using `data-intent-id`.
- Webhook endpoint at `/wp-json/redeemloop/v1/woocommerce/mark-paid`.

Shopify should initially use product-page buttons or external/manual payment bridge patterns. Do not block the early protocol on a Shopify payment app review.

### 10. Webhook Delivery Operations

When settlement confirmation moves a `PaymentIntent` to `paid`, the API writes a `payment_intent.paid` event and creates delivery records for active matching webhook endpoints.

Outbound requests are signed with:

```text
X-RedeemLoop-Event-Id
X-RedeemLoop-Delivery-Id
X-RedeemLoop-Timestamp
X-RedeemLoop-Nonce
X-RedeemLoop-Signature = hex(hmac_sha256(secret, timestamp + "." + nonce + "." + rawBody))
```

Useful operations:

```http
GET  /v1/webhook-events?merchantId=merchant_cafe
GET  /v1/webhook-deliveries?merchantId=merchant_cafe
POST /v1/webhook-deliveries/:deliveryId/attempt
POST /v1/webhook-deliveries/:deliveryId/replay
```

SDK helpers:

```ts
await client.listWebhookEvents({ merchantId: "merchant_cafe" });
await client.listWebhookDeliveries({ merchantId: "merchant_cafe", status: "failed" });
await client.attemptWebhookDelivery("whd_...");
await client.replayWebhookDelivery("whd_...", { attemptNow: true });
```

### 11. Current Limits

- Production database migrations are not included yet; v0.2.2 persistence is a file-backed sandbox adapter.
- Client-submitted settlement proof still exists for sandbox/manual flows; EVM ERC-20 can now use trusted receipt recheck.
- Webhook delivery operations are implemented as a sandbox outbox in the API process. Production deployments should move the same model to a managed database and worker queue.

---

## 中文

### 1. 集成模型

RedeemLoop 是一个外部提货券支付网关。电商系统仍然负责商品定价、订单、履约、税务、退款和客服。

RedeemLoop 只负责这条路径：

```text
Asset Binding -> PaymentIntent -> 提货券转账请求 -> 收券确认 -> 电商 mark-as-paid
```

提货资产由商户自带。RedeemLoop 不发行、不 mint、不 etch、不 inscribe、不托管、不定价、不交易该资产。

### 2. 商户配置流程

1. 创建 merchant。
2. 创建 merchant vault / 收券地址。
3. 创建商品或服务 entitlement。
4. 创建 Asset Binding，把可接受提货资产、entitlement、SKU、店铺目标、结算策略和收券地址绑定起来。
5. 嵌入 React Pay Button 或 script widget。
6. settlement 确认后接收 mark-as-paid 通知。

完整本地 sandbox 请见 [Public Merchant Sandbox](PUBLIC_SANDBOX.md)。逐端点 API reference 请见 [API Reference](API_REFERENCE.md)。
Bitcoin Rune 钱包/索引器 beta 支持请见 [Bitcoin Rune Alpha](BITCOIN_RUNE_ALPHA.md) 和 [Bitcoin Rune Real-Usability Plan](BITCOIN_RUNE_REAL_USABILITY.md)。

### 2.1 Bitcoin Rune 钱包路径

真实商户 Rune 集成应优先使用钱包原生转账方法，而不是服务端 PSBT fixture boundary：

- UniSat：调用 `createUniSatRuneWalletAdapter(window.unisat)`，并使用带 `runeId` 的 `requestRuneTransfer`。
- Xverse：调用 `createXverseRuneWalletAdapter(request)`，并使用带 `runeName` 的 `requestRuneTransfer`。
- 收券确认：调用 `createXverseRuneIndexerAdapter` 或其他 `RuneIndexerAdapter` 实现，再把返回的 proof 提交到 `POST /v1/settlement/proofs`。

`transfer.bitcoin.psbtBase64` API 响应仍可用于 adapter integration test。它不是生产级 PSBT engine。

### 3. SDK 流程

```ts
import { RedeemLoopClient } from "@redeemloop/sdk";

const client = new RedeemLoopClient("https://api.example.com", "merchant-api-key");

await client.createMerchant({ merchantId: "merchant_cafe", name: "Merchant Cafe" });
await client.createMerchantVault({
  merchantId: "merchant_cafe",
  chainNamespace: "eip155",
  chainId: 8453,
  address: "0xMerchantVault",
});

await client.createEntitlement({
  merchantId: "merchant_cafe",
  entitlementId: "ent_coffee",
  name: "Coffee pickup",
  quantity: 1,
  termsHash: "coffee-terms",
});

await client.createBinding({
  bindingId: "bind_coffee",
  merchantId: "merchant_cafe",
  entitlementId: "ent_coffee",
  acceptedAssets: [
    {
      chainNamespace: "eip155",
      chainId: 8453,
      assetType: "erc20",
      assetId: "eip155:8453/erc20:0xVoucherToken",
      contract: "0xVoucherToken",
      requiredAmount: "1",
      termsHash: "coffee-terms",
    },
  ],
  merchantVaults: {
    "eip155:8453": "0xMerchantVault",
  },
  settlementPolicy: "collect",
  commerceTargets: [{ platform: "woocommerce", storeId: "woo-store", sku: "coffee-cup" }],
  status: "active",
  termsHash: "coffee-terms",
});
```

### 4. React Pay Button

```tsx
import { RedeemLoopPayButton, RedeemLoopProvider } from "@redeemloop/react";

export function Checkout() {
  return (
    <RedeemLoopProvider baseUrl="https://api.example.com" apiKey="merchant-api-key">
      <RedeemLoopPayButton
        bindingId="bind_coffee"
        orderId="ORDER-1001"
        channel="checkout"
        skuLines={[{ sku: "coffee-cup", quantity: 1 }]}
        payerAddress="0xPayer"
        balance="1"
        onComplete={(result) => console.log(result.transfer)}
      />
    </RedeemLoopProvider>
  );
}
```

Alpha 阶段按钮会创建 PaymentIntent，可选执行余额检查，并返回钱包可用的转账请求。sandbox 流程中如果传入 `txid` 和 `autoSubmitProof`，也可以继续提交 settlement proof。

### 5. Script Widget

```html
<div
  data-redeemloop-pay-button
  data-api-base-url="https://api.example.com"
  data-api-key="merchant-api-key"
  data-binding-id="bind_coffee"
  data-order-id="ORDER-1001"
  data-sku="coffee-cup"
  data-payer-address="0xPayer"
  data-balance="1"
></div>
<script type="module" src="/redeemloop-widget.js"></script>
```

widget 会发出 DOM 事件：

```text
redeemloop:intent
redeemloop:balance
redeemloop:transfer
redeemloop:broadcasted
redeemloop:paid
redeemloop:error
```

### 6. EVM ERC-20 支付请求

API 暴露面向钱包的步骤：

```http
POST /v1/payment-intents/:intentId/check-balance
POST /v1/payment-intents/:intentId/transfer-requested
POST /v1/payment-intents/:intentId/broadcasted
POST /v1/settlement/proofs
POST /v1/settlement/evm/recheck/:intentId
```

`check-balance` 返回 `balanceOf(payer)` call request。`transfer-requested` 返回 ERC-20 `transfer(merchantVault, requiredAmount)` calldata，并且 `value: 0x0`。
可信 EVM settlement 流程中，先记录广播 tx hash，再调用 `settlement/evm/recheck`。API 会通过 `RPC_URL` 读取 receipt，校验 ERC-20 `Transfer` log，计算确认数，并创建 trusted proof。

### 7. 嵌入来源控制

本地开发默认允许 `http://localhost:3000` 和 `http://127.0.0.1:3000`。

商户部署时配置：

```bash
REDEEMLOOP_EMBED_ALLOWED_ORIGINS="https://shop.example,https://checkout.example"
```

已验证的商户域名也会被 API CORS 策略放行。

### 8. Sandbox 持久化和 API Keys

本地或 pilot 环境可以把 API 状态持久化到 JSON 文件：

```bash
REDEEMLOOP_STORAGE_FILE=.redeemloop/state.json pnpm api:dev
```

文件持久化 adapter 会保存 merchant、vault、entitlement、binding、PaymentIntent、settlement proof、幂等 key、webhook endpoint、webhook event、webhook delivery record 和 commerce payment record。它适合重启恢复和 pilot demo，但生产部署仍应迁移到托管数据库。

商户级 API key 校验可以这样开启：

```bash
REDEEMLOOP_API_KEYS="merchant_cafe:dev-secret,merchant_shop:shop-secret"
```

或：

```bash
REDEEMLOOP_API_KEYS='{"merchant_cafe":"dev-secret"}'
```

配置 API key 后，商户级 `/v1` 请求必须携带：

```http
Authorization: Bearer dev-secret
```

### 9. WooCommerce 和 Shopify

v0.4.1 已包含 WooCommerce sandbox payment gateway 插件：

```text
plugins/woocommerce/redeemloop-voucher-gateway.php
```

WooCommerce 应优先实现为原生 payment gateway 插件：

```text
Checkout payment method -> RedeemLoop Pay Button/widget -> settlement confirmation -> payment_complete
```

插件提供：

- WooCommerce payment method 注册。
- 后台配置 API Base URL、Merchant ID、API Key、Default Binding ID、Webhook Secret 和可选 widget script URL。
- checkout 时创建 PaymentIntent。
- order-received 页面通过 `data-intent-id` 展示 widget 容器。
- webhook endpoint：`/wp-json/redeemloop/v1/woocommerce/mark-paid`。

Shopify 初期建议采用商品页按钮或 external/manual payment bridge 模式，不要让早期协议阻塞在 Shopify payment app 审核上。

### 10. Webhook 投递运维

当 settlement confirmation 把 `PaymentIntent` 推进到 `paid` 后，API 会写入 `payment_intent.paid` event，并为匹配的 active webhook endpoint 创建 delivery record。

出站请求签名：

```text
X-RedeemLoop-Event-Id
X-RedeemLoop-Delivery-Id
X-RedeemLoop-Timestamp
X-RedeemLoop-Nonce
X-RedeemLoop-Signature = hex(hmac_sha256(secret, timestamp + "." + nonce + "." + rawBody))
```

常用运维 API：

```http
GET  /v1/webhook-events?merchantId=merchant_cafe
GET  /v1/webhook-deliveries?merchantId=merchant_cafe
POST /v1/webhook-deliveries/:deliveryId/attempt
POST /v1/webhook-deliveries/:deliveryId/replay
```

SDK helper：

```ts
await client.listWebhookEvents({ merchantId: "merchant_cafe" });
await client.listWebhookDeliveries({ merchantId: "merchant_cafe", status: "failed" });
await client.attemptWebhookDelivery("whd_...");
await client.replayWebhookDelivery("whd_...", { attemptNow: true });
```

### 11. 当前限制

- 尚未提供生产数据库 migrations；v0.2.2 的持久化是文件型 sandbox adapter。
- 客户端提交 settlement proof 仍保留用于 sandbox/manual flow；EVM ERC-20 现在可以使用可信 receipt recheck。
- webhook delivery operations 已作为 API 进程内 sandbox outbox 实现。生产部署应迁移到托管数据库和 worker queue。
