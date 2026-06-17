# API and Data Model

## 1. REST API

### Current v0.1.0 Prototype Endpoints

```http
GET  /health
GET  /v1/config
POST /v1/merchants/:merchantId/receiving-address
GET  /v1/merchants/:merchantId/receiving-address?chainId=31337
POST /v1/terminals/register
POST /v1/commerce/payment-intents
POST /v1/commerce/confirm
POST /v1/webhooks/shopify/mark-as-paid
POST /v1/webhooks/woocommerce/mark-as-paid
POST /v1/redemptions/intents
POST /v1/redemptions/submit
```

### Configure Merchant Receiving Address

```http
POST /v1/merchants/:merchantId/receiving-address
```

```json
{
  "chainId": 31337,
  "receivingAddress": "0x0000000000000000000000000000000000000abc"
}
```

The API normalizes `merchantId` to `bytes32` and the receiving address to an EIP-55 checksum address.

### Create Commerce Payment Intent

```http
POST /v1/commerce/payment-intents
```

```json
{
  "provider": "shopify",
  "chainId": 31337,
  "merchantId": "coca-cola-japan",
  "orderId": "148977776",
  "voucherToken": "0x0000000000000000000000000000000000000def",
  "amount": "1",
  "receiver": "0x0000000000000000000000000000000000000abc"
}
```

Returns a RedeemLoop payment record with `status = "intent_created"`.

### Confirm Commerce Payment

```http
POST /v1/commerce/confirm
```

```json
{
  "provider": "woocommerce",
  "chainId": 31337,
  "merchantId": "coca-cola-japan",
  "orderId": "42",
  "voucherToken": "0x0000000000000000000000000000000000000def",
  "amount": "1",
  "receiver": "0x0000000000000000000000000000000000000abc",
  "txHash": "0x...",
  "redemptionId": "123"
}
```

The API rejects a `receiver` that does not match the configured merchant receiving address. In dry-run mode, Shopify and WooCommerce adapter responses include the exact outbound request without writing to the commerce platform.

### Mark-as-paid Webhooks

```http
POST /v1/webhooks/shopify/mark-as-paid
POST /v1/webhooks/woocommerce/mark-as-paid
```

If configured, Shopify requests must include `X-Shopify-Hmac-SHA256`; WooCommerce requests must include `X-WC-Webhook-Signature`. Both signatures are verified as base64 HMAC-SHA256 values over the raw request body.

### Create Merchant

```http
POST /v1/merchants
```

```json
{
  "displayName": "Coca-Cola Japan",
  "domain": "coca-cola.example",
  "adminWallet": "0x..."
}
```

### Create Voucher Class

```http
POST /v1/voucher-classes
```

```json
{
  "merchantId": "coca-cola",
  "profile": "ERC20",
  "name": "Coke Bottle Voucher",
  "symbol": "COKE1",
  "maxSupply": "100000000",
  "redemptionMode": "COLLECT",
  "termsUri": "ipfs://...",
  "termsHash": "0x..."
}
```

### Create Claim Intent

```http
POST /v1/campaigns/:id/claim-intents
```

### Create Redemption Intent

```http
POST /v1/redemptions/intents
```

```json
{
  "user": "0x...",
  "token": "0xVoucherToken",
  "amount": "1",
  "storeId": "tokyo-store-001",
  "terminalId": "pos-07"
}
```

### Submit Redemption

```http
POST /v1/redemptions/submit
```

```json
{
  "authorization": { "...": "..." },
  "signature": "0x..."
}
```

## 2. Database Tables

```sql
CREATE TABLE merchants (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  domain TEXT,
  admin_wallet TEXT NOT NULL,
  default_vault TEXT,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE voucher_classes (
  id TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL REFERENCES merchants(id),
  chain_id INTEGER NOT NULL,
  token_address TEXT NOT NULL,
  profile TEXT NOT NULL,
  symbol TEXT NOT NULL,
  decimals INTEGER NOT NULL DEFAULT 0,
  max_supply NUMERIC NOT NULL,
  redemption_mode TEXT NOT NULL,
  terms_hash TEXT NOT NULL,
  terms_uri TEXT NOT NULL,
  status TEXT NOT NULL
);

CREATE TABLE redemptions (
  id TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL,
  store_id TEXT,
  terminal_id TEXT,
  user_wallet TEXT NOT NULL,
  token_address TEXT NOT NULL,
  token_id NUMERIC NOT NULL DEFAULT 0,
  amount NUMERIC NOT NULL,
  mode TEXT NOT NULL,
  status TEXT NOT NULL,
  nonce TEXT NOT NULL,
  tx_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE merchant_receiving_addresses (
  merchant_id TEXT NOT NULL,
  chain_id INTEGER NOT NULL,
  receiving_address TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (merchant_id, chain_id)
);

CREATE TABLE commerce_payments (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  merchant_id TEXT NOT NULL,
  chain_id INTEGER NOT NULL,
  order_id TEXT NOT NULL,
  voucher_token TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  receiver TEXT NOT NULL,
  status TEXT NOT NULL,
  dry_run BOOLEAN NOT NULL DEFAULT true,
  tx_hash TEXT,
  redemption_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## 3. Webhooks

Merchant systems can subscribe to:

```text
voucher.issued
voucher.redeemed
voucher.collected
voucher.burned
voucher.reissued
redemption.failed
```
