# RedeemLoop API Reference v0.9.0

## English

Base URL:

```text
http://localhost:3002
```

When `REDEEMLOOP_API_KEYS` is configured, merchant-scoped requests require:

```http
Authorization: Bearer <merchant-api-key>
```

### Core Setup

```http
POST /v1/merchants
GET  /v1/merchants/:merchantId
POST /v1/merchants/:merchantId/domains/verify
POST /v1/merchant-vaults
GET  /v1/merchant-vaults?merchantId=...
POST /v1/merchant-vaults/:vaultId/verification-challenge
POST /v1/merchant-vaults/:vaultId/verify-signature
POST /v1/entitlements
GET  /v1/entitlements/:entitlementId
PATCH /v1/entitlements/:entitlementId
POST /v1/bindings
GET  /v1/bindings/:bindingId
GET  /v1/bindings?merchantId=...&sku=...
PATCH /v1/bindings/:bindingId
POST /v1/bindings/:bindingId/pause
POST /v1/bindings/:bindingId/activate
```

### PaymentIntent

```http
POST /v1/payment-intents
GET  /v1/payment-intents?merchantId=...&bindingId=...&status=...&orderId=...
GET  /v1/payment-intents/:intentId
POST /v1/payment-intents/:intentId/connect-wallet
POST /v1/payment-intents/:intentId/select-asset
POST /v1/payment-intents/:intentId/check-balance
POST /v1/payment-intents/:intentId/transfer-requested
POST /v1/payment-intents/:intentId/broadcasted
POST /v1/payment-intents/:intentId/cancel
POST /v1/payment-intents/expire-stale
POST /v1/pos/payment-intents
POST /v1/short-links/payment-intents
GET  /v1/short-links/:slug
GET  /v1/public/short-links/:slug?checkoutToken=...
GET  /v1/public/payment-sessions/:intentId?checkoutToken=...
POST /v1/public/payment-sessions/:intentId/connect-wallet
POST /v1/public/payment-sessions/:intentId/transfer-requested
POST /v1/public/payment-sessions/:intentId/broadcasted
POST /v1/public/payment-sessions/:intentId/settlement/evm/recheck
```

POS QR and short-link creation responses include a `checkoutToken` and a hosted checkout URL. The `/v1/public/...` endpoints are scoped to that token and can be used by customer-facing hosted payment pages without exposing the merchant API key. Public session responses never return the raw token or a tokenized URL after creation.

For Bitcoin Rune assets, `transfer-requested` accepts `network`, `feeRate`, `changeAddress`, `payerPublicKey`, and `runeUtxos`, then returns `transfer.bitcoin.psbtBase64`. This API response remains a PSBT fixture boundary. Real wallet flows should prefer the adapter-level UniSat `sendRunes` or Xverse `runes_transfer` path, then submit indexer-backed proof.

For EVM ERC-20 assets, `transfer-requested` returns `transfer.evm.transaction` for wallet sending. Trusted EVM receipt recheck uses `RPC_URL` for one-chain deployments or `EVM_RPC_URLS` for chain-specific RPC routing across Ethereum, BSC, Polygon, and Arbitrum.

### Settlement

```http
POST /v1/settlement/proofs
GET  /v1/settlement/proofs/:proofId
POST /v1/settlement/recheck/:intentId
POST /v1/settlement/evm/recheck/:intentId
POST /v1/settlement/rune/recheck/:intentId
```

`POST /v1/settlement/rune/recheck/:intentId` accepts `manualReviewOnIndexerError: true`. If the configured Rune indexer fails, the API returns `202` and moves the PaymentIntent to `manual_review` instead of losing the checkout trail.

`POST /v1/settlement/rune/recheck/:intentId` accepts `txid`, optional `from`, and optional `confirmations`. It uses the configured `RuneIndexerAdapter`; by default the API creates an Xverse adapter from `XVERSE_API_KEY`, `XVERSE_NETWORK`, and optional `XVERSE_API_BASE_URL`.

### Webhooks

```http
POST /v1/webhook-endpoints
GET  /v1/webhook-endpoints?merchantId=...
POST /v1/webhook-endpoints/:id/test
GET  /v1/webhook-events?merchantId=...
GET  /v1/webhook-events/:eventId
GET  /v1/webhook-deliveries?merchantId=...
GET  /v1/webhook-deliveries/:deliveryId
POST /v1/webhook-deliveries/drain-pending
POST /v1/webhook-deliveries/:deliveryId/attempt
POST /v1/webhook-deliveries/:deliveryId/replay
```

`POST /v1/webhook-deliveries/drain-pending` accepts `merchantId`, `limit`, `workerId`, and `leaseMs`. It claims due `pending` or `failed` deliveries as `processing` before sending, writes `leaseOwner`, `leaseAcquiredAt`, and `leaseExpiresAt`, and allows expired `processing` leases to be reclaimed by a later drain. Delivery status values are `pending`, `processing`, `delivered`, `failed`, and `dead_letter`.

### Audit Logs

```http
GET /v1/audit-logs?merchantId=...&entityType=...&entityId=...&action=...
```

v0.4.5 records audit entries for merchant vault creation, vault challenge creation, vault signature verification, PaymentIntent creation, PaymentIntent state changes, settlement proof advancement, and expiration cleanup.

### Sandbox Health and Config

```http
GET /health
GET /v1/config
GET /v1/diagnostics/evm-rpc
GET /v1/diagnostics/shopify
GET /v1/diagnostics/webhooks?merchantId=...
```

`GET /v1/diagnostics/evm-rpc` reports ETH/BSC/Polygon/Arbitrum RPC status, source, origin, latest block height, and latency. It does not return the full RPC URL to avoid leaking provider API keys.
`GET /v1/diagnostics/shopify` reports private-app Admin API readiness without returning the Admin access token.
`GET /v1/diagnostics/webhooks` reports delivery status counts, stale `processing` leases, recent worker drain heartbeats, and recommended actions. When API keys are enabled, pass `merchantId` and the merchant bearer token.
`GET /v1/config` returns `persistence.enabled` and `persistence.kind`, where kind is `none`, `json-file`, or `postgres`.

## 中文

Base URL：

```text
http://localhost:3002
```

配置 `REDEEMLOOP_API_KEYS` 后，商户级请求必须携带：

```http
Authorization: Bearer <merchant-api-key>
```

### 核心配置

```http
POST /v1/merchants
GET  /v1/merchants/:merchantId
POST /v1/merchants/:merchantId/domains/verify
POST /v1/merchant-vaults
GET  /v1/merchant-vaults?merchantId=...
POST /v1/merchant-vaults/:vaultId/verification-challenge
POST /v1/merchant-vaults/:vaultId/verify-signature
POST /v1/entitlements
GET  /v1/entitlements/:entitlementId
PATCH /v1/entitlements/:entitlementId
POST /v1/bindings
GET  /v1/bindings/:bindingId
GET  /v1/bindings?merchantId=...&sku=...
PATCH /v1/bindings/:bindingId
POST /v1/bindings/:bindingId/pause
POST /v1/bindings/:bindingId/activate
```

### PaymentIntent

```http
POST /v1/payment-intents
GET  /v1/payment-intents?merchantId=...&bindingId=...&status=...&orderId=...
GET  /v1/payment-intents/:intentId
POST /v1/payment-intents/:intentId/connect-wallet
POST /v1/payment-intents/:intentId/select-asset
POST /v1/payment-intents/:intentId/check-balance
POST /v1/payment-intents/:intentId/transfer-requested
POST /v1/payment-intents/:intentId/broadcasted
POST /v1/payment-intents/:intentId/cancel
POST /v1/payment-intents/expire-stale
POST /v1/pos/payment-intents
POST /v1/short-links/payment-intents
GET  /v1/short-links/:slug
GET  /v1/public/short-links/:slug?checkoutToken=...
GET  /v1/public/payment-sessions/:intentId?checkoutToken=...
POST /v1/public/payment-sessions/:intentId/connect-wallet
POST /v1/public/payment-sessions/:intentId/transfer-requested
POST /v1/public/payment-sessions/:intentId/broadcasted
POST /v1/public/payment-sessions/:intentId/settlement/evm/recheck
```

POS QR 和短链创建响应会包含 `checkoutToken` 和 hosted checkout URL。`/v1/public/...` 端点只对该 token 对应的 PaymentIntent 生效，用户侧 hosted payment page 可以使用它们完成支付，而不需要暴露商户 API key。创建之后，public session 响应不会再次返回原始 token 或带 token 的 URL。

对于 Bitcoin Rune 资产，`transfer-requested` 可接收 `network`、`feeRate`、`changeAddress`、`payerPublicKey` 和 `runeUtxos`，并返回 `transfer.bitcoin.psbtBase64`。该 API 响应仍是 PSBT fixture boundary。真实钱包流程应优先使用 adapter 层 UniSat `sendRunes` 或 Xverse `runes_transfer` 路径，然后提交 indexer-backed proof。

对于 EVM ERC-20 资产，`transfer-requested` 会返回 `transfer.evm.transaction`，用于钱包发起交易。可信 EVM receipt recheck 在单链部署中使用 `RPC_URL`，在 Ethereum、BSC、Polygon、Arbitrum 多链部署中可使用 `EVM_RPC_URLS` 做按 chainId 的 RPC 路由。

### Settlement

```http
POST /v1/settlement/proofs
GET  /v1/settlement/proofs/:proofId
POST /v1/settlement/recheck/:intentId
POST /v1/settlement/evm/recheck/:intentId
POST /v1/settlement/rune/recheck/:intentId
```

`POST /v1/settlement/rune/recheck/:intentId` 支持 `manualReviewOnIndexerError: true`。如果配置的 Rune indexer 失败，API 会返回 `202`，并把 PaymentIntent 推进到 `manual_review`，避免丢失 checkout trail。

`POST /v1/settlement/rune/recheck/:intentId` 接收 `txid`、可选 `from` 和可选 `confirmations`。它会使用配置好的 `RuneIndexerAdapter`；默认情况下 API 会根据 `XVERSE_API_KEY`、`XVERSE_NETWORK` 和可选 `XVERSE_API_BASE_URL` 创建 Xverse adapter。

### Webhooks

```http
POST /v1/webhook-endpoints
GET  /v1/webhook-endpoints?merchantId=...
POST /v1/webhook-endpoints/:id/test
GET  /v1/webhook-events?merchantId=...
GET  /v1/webhook-events/:eventId
GET  /v1/webhook-deliveries?merchantId=...
GET  /v1/webhook-deliveries/:deliveryId
POST /v1/webhook-deliveries/drain-pending
POST /v1/webhook-deliveries/:deliveryId/attempt
POST /v1/webhook-deliveries/:deliveryId/replay
```

`POST /v1/webhook-deliveries/drain-pending` 接收 `merchantId`、`limit`、`workerId` 和 `leaseMs`。它会先把到期的 `pending` 或 `failed` delivery 领取为 `processing` 再发送，写入 `leaseOwner`、`leaseAcquiredAt` 和 `leaseExpiresAt`；过期的 `processing` lease 可以被后续 drain 重新领取。Delivery status 包含 `pending`、`processing`、`delivered`、`failed` 和 `dead_letter`。

### Audit Logs

```http
GET /v1/audit-logs?merchantId=...&entityType=...&entityId=...&action=...
```

v0.4.5 会记录 merchant vault 创建、vault challenge 创建、vault 签名验证、PaymentIntent 创建、PaymentIntent 状态变化、settlement proof 推进和过期清理等审计事件。

### Sandbox Health 和 Config

```http
GET /health
GET /v1/config
GET /v1/diagnostics/evm-rpc
GET /v1/diagnostics/shopify
GET /v1/diagnostics/webhooks?merchantId=...
```

`GET /v1/diagnostics/evm-rpc` 会返回 ETH/BSC/Polygon/Arbitrum 的 RPC 状态、来源、origin、最新块高和延迟。接口不会返回完整 RPC URL，以避免泄漏 provider API key。
`GET /v1/diagnostics/shopify` 会返回 private-app Admin API 准备状态，但不会返回 Admin access token。
`GET /v1/diagnostics/webhooks` 会返回 delivery 状态统计、stale `processing` lease、最近 worker drain heartbeat 和 recommended actions。启用 API key 时，请传入 `merchantId` 并携带该商户 bearer token。
`GET /v1/config` 会返回 `persistence.enabled` 和 `persistence.kind`，其中 kind 为 `none`、`json-file` 或 `postgres`。
