# RedeemLoop API Reference v0.4.1

## English

Base URL:

```text
http://localhost:8787
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
GET  /v1/payment-intents/:intentId
POST /v1/payment-intents/:intentId/connect-wallet
POST /v1/payment-intents/:intentId/select-asset
POST /v1/payment-intents/:intentId/check-balance
POST /v1/payment-intents/:intentId/transfer-requested
POST /v1/payment-intents/:intentId/broadcasted
POST /v1/payment-intents/:intentId/cancel
```

For Bitcoin Rune assets, `transfer-requested` accepts `network`, `feeRate`, `changeAddress`, `payerPublicKey`, and `runeUtxos`, then returns `transfer.bitcoin.psbtBase64`. This API response remains a PSBT fixture boundary. Real wallet flows should prefer the adapter-level UniSat `sendRunes` or Xverse `runes_transfer` path, then submit indexer-backed proof.

### Settlement

```http
POST /v1/settlement/proofs
GET  /v1/settlement/proofs/:proofId
POST /v1/settlement/recheck/:intentId
POST /v1/settlement/evm/recheck/:intentId
```

### Webhooks

```http
POST /v1/webhook-endpoints
GET  /v1/webhook-endpoints?merchantId=...
POST /v1/webhook-endpoints/:id/test
GET  /v1/webhook-events?merchantId=...
GET  /v1/webhook-events/:eventId
GET  /v1/webhook-deliveries?merchantId=...
GET  /v1/webhook-deliveries/:deliveryId
POST /v1/webhook-deliveries/:deliveryId/attempt
POST /v1/webhook-deliveries/:deliveryId/replay
```

### Sandbox Health and Config

```http
GET /health
GET /v1/config
```

## 中文

Base URL：

```text
http://localhost:8787
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
GET  /v1/payment-intents/:intentId
POST /v1/payment-intents/:intentId/connect-wallet
POST /v1/payment-intents/:intentId/select-asset
POST /v1/payment-intents/:intentId/check-balance
POST /v1/payment-intents/:intentId/transfer-requested
POST /v1/payment-intents/:intentId/broadcasted
POST /v1/payment-intents/:intentId/cancel
```

对于 Bitcoin Rune 资产，`transfer-requested` 可接收 `network`、`feeRate`、`changeAddress`、`payerPublicKey` 和 `runeUtxos`，并返回 `transfer.bitcoin.psbtBase64`。该 API 响应仍是 PSBT fixture boundary。真实钱包流程应优先使用 adapter 层 UniSat `sendRunes` 或 Xverse `runes_transfer` 路径，然后提交 indexer-backed proof。

### Settlement

```http
POST /v1/settlement/proofs
GET  /v1/settlement/proofs/:proofId
POST /v1/settlement/recheck/:intentId
POST /v1/settlement/evm/recheck/:intentId
```

### Webhooks

```http
POST /v1/webhook-endpoints
GET  /v1/webhook-endpoints?merchantId=...
POST /v1/webhook-endpoints/:id/test
GET  /v1/webhook-events?merchantId=...
GET  /v1/webhook-events/:eventId
GET  /v1/webhook-deliveries?merchantId=...
GET  /v1/webhook-deliveries/:deliveryId
POST /v1/webhook-deliveries/:deliveryId/attempt
POST /v1/webhook-deliveries/:deliveryId/replay
```

### Sandbox Health 和 Config

```http
GET /health
GET /v1/config
```
