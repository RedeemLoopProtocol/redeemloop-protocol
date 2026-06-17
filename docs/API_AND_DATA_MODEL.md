# RedeemLoop API 与数据模型 v0.2

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
POST /v1/payment-intents/:intentId/transfer-requested
POST /v1/payment-intents/:intentId/broadcasted
POST /v1/payment-intents/:intentId/cancel
```

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
```

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

### webhook_deliveries

```text
id
event_id
endpoint_id
intent_id
event_type
payload_json
status
attempts
last_error
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
