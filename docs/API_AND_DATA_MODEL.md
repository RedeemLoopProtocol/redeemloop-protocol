# RedeemLoop API 与数据模型 v0.3

## 1. REST API

### Merchants

```http
POST /v1/merchants
GET  /v1/merchants/:merchantId
POST /v1/merchants/:merchantId/domains/verify
```

### Vaults

```http
POST /v1/merchant-vaults
GET  /v1/merchant-vaults?merchantId=...
POST /v1/merchant-vaults/:vaultId/verify-signature
```

### Entitlements

```http
POST /v1/entitlements
GET  /v1/entitlements/:entitlementId
PATCH /v1/entitlements/:entitlementId
```

### Bindings

```http
POST /v1/bindings
GET  /v1/bindings/:bindingId
GET  /v1/bindings?merchantId=...&sku=...
PATCH /v1/bindings/:bindingId
POST /v1/bindings/:bindingId/pause
POST /v1/bindings/:bindingId/activate
```

### Payment Intents

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

`POST /v1/payment-intents/:intentId/check-balance` 返回 EVM ERC-20 `balanceOf(payer)` call request，并可在传入 `balance` 时判断余额是否足够：

```json
{
  "payerAddress": "0xPayer",
  "balance": "1"
}
```

```json
{
  "status": "asset_selected",
  "balanceCheck": {
    "chainNamespace": "eip155",
    "chainId": 8453,
    "assetType": "erc20",
    "account": "0xPayer",
    "contract": "0xVoucherToken",
    "requiredAmount": "1",
    "call": {
      "chainId": 8453,
      "to": "0xVoucherToken",
      "data": "0x70a08231...",
      "functionName": "balanceOf",
      "args": ["0xPayer"]
    },
    "providedBalance": "1",
    "hasSufficientBalance": true,
    "shortfall": "0"
  }
}
```

`POST /v1/payment-intents/:intentId/transfer-requested` 返回标准化转券请求。对于 EVM ERC-20 资产，响应包含钱包可直接使用的 `evm.transaction`：

```json
{
  "status": "transfer_requested",
  "transfer": {
    "to": "0xMerchantVault",
    "amount": "1",
    "settlementPolicy": "collect",
    "evm": {
      "chainNamespace": "eip155",
      "chainId": 8453,
      "assetType": "erc20",
      "contract": "0xVoucherToken",
      "transaction": {
        "chainId": 8453,
        "to": "0xVoucherToken",
        "data": "0xa9059cbb...",
        "value": "0x0",
        "functionName": "transfer",
        "args": ["0xMerchantVault", "1"]
      }
    }
  }
}
```

客户端应把 `transaction.to` 作为 ERC-20 合约地址，把 `transaction.data` 作为 calldata，引导用户钱包把指定数量的已有提货资产转入商户收券地址。

### Settlement

```http
POST /v1/settlement/proofs
GET  /v1/settlement/proofs/:proofId
POST /v1/settlement/recheck/:intentId
```

### Webhooks

```http
POST /v1/webhook-endpoints
GET  /v1/webhook-endpoints
POST /v1/webhook-endpoints/:id/test
GET  /v1/webhook-events?merchantId=...
GET  /v1/webhook-events/:eventId
GET  /v1/webhook-deliveries?merchantId=...
GET  /v1/webhook-deliveries/:deliveryId
POST /v1/webhook-deliveries/:deliveryId/attempt
POST /v1/webhook-deliveries/:deliveryId/replay
```

`payment_intent.paid` events are written to the sandbox outbox when settlement proof or trusted EVM recheck moves a `PaymentIntent` to `paid`. Delivery attempts are signed with `X-RedeemLoop-Event-Id`, `X-RedeemLoop-Delivery-Id`, `X-RedeemLoop-Timestamp`, `X-RedeemLoop-Nonce`, and `X-RedeemLoop-Signature`.

当 settlement proof 或可信 EVM recheck 将 `PaymentIntent` 推进到 `paid` 后，API 会把 `payment_intent.paid` event 写入 sandbox outbox。Delivery attempt 会使用 `X-RedeemLoop-Event-Id`、`X-RedeemLoop-Delivery-Id`、`X-RedeemLoop-Timestamp`、`X-RedeemLoop-Nonce` 和 `X-RedeemLoop-Signature` 签名。

## 2. 数据库表

### merchants

```text
id
merchant_id
name
status
created_at
updated_at
```

### merchant_vaults

```text
id
merchant_id
chain_namespace
chain_id
address
verification_status
verification_signature
created_at
updated_at
```

### entitlements

```text
id
entitlement_id
merchant_id
name
description
quantity
region
validity_json
terms_hash
terms_uri
created_at
updated_at
```

### redemption_bindings

```text
id
binding_id
merchant_id
entitlement_id
settlement_policy
status
terms_hash
created_at
updated_at
```

### binding_assets

```text
id
binding_id
chain_namespace
chain_id
asset_type
asset_id
contract
token_id
rune_id
rune_name
inscription_id
collection_id
required_amount
terms_hash
metadata_json
created_at
updated_at
```

### commerce_targets

```text
id
binding_id
platform
store_id
product_id
variant_id
sku
entitlement_group_id
country
channel
created_at
updated_at
```

### payment_intents

```text
id
intent_id
binding_id
merchant_id
store_id
channel
order_id
payer_address
selected_asset_json
merchant_vault
settlement_policy
status
expires_at
created_at
updated_at
```

### payment_proofs

```text
id
proof_id
intent_id
chain_namespace
chain_id
txid
block_number
block_hash
confirmations
from_address
to_address
asset_type
asset_id
contract
token_id
amount
log_index
output_index
status
raw_proof_json
created_at
updated_at
```

### webhook_events

```text
id
event_id
merchant_id
event_type
payload_json
delivery_ids_json
created_at
updated_at
```

### webhook_deliveries

```text
id
delivery_id
event_id
endpoint_id
merchant_id
event_type
url
status
attempts
max_attempts
next_attempt_at
last_attempt_at
delivered_at
last_error
response_status
response_body_json
request_json
created_at
updated_at
```

## 3. 事件

```text
binding.created
binding.activated
binding.paused
payment.created
payment.transfer_requested
payment.broadcasted
payment.seen
payment.confirmed
payment.paid
payment.failed
payment.expired
webhook.delivered
webhook.failed
```
