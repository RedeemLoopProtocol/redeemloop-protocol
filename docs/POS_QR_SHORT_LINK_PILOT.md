# POS QR and Short-Link Pilot

## English

RedeemLoop v0.8.0 adds PaymentIntent-native POS QR and livestream short-link pilot APIs.

### POS QR

Register a terminal:

```http
POST /v1/terminals/register
```

Create a terminal-scoped POS PaymentIntent:

```http
POST /v1/pos/payment-intents
```

```json
{
  "bindingId": "bind_coffee",
  "storeId": "tokyo-store-001",
  "terminalId": "pos-07",
  "terminalNonce": "nonce-1",
  "orderId": "POS-1001"
}
```

The response includes `paymentIntent` and a `qr` payload. `terminalNonce` is stored to prevent replay for the registered merchant/store/terminal.

### Short Links

Create a livestream or campaign short link:

```http
POST /v1/short-links/payment-intents
```

```json
{
  "bindingId": "bind_coffee",
  "slug": "live-drop",
  "baseUrl": "https://pay.example",
  "channel": "livestream",
  "orderId": "LIVE-1001"
}
```

Resolve it:

```http
GET /v1/short-links/live-drop
```

Both POS QR and short links reconcile back to the same `PaymentIntent`, settlement proof, webhook, audit log, and commerce mark-as-paid model.

The local POS console can register a terminal, create a POS QR payload, create a short link, and refresh PaymentIntent status during a pilot run.

## 中文

RedeemLoop v0.8.0 新增基于 PaymentIntent 的 POS QR 和直播短链 pilot API。

### POS QR

注册终端：

```http
POST /v1/terminals/register
```

创建 terminal-scoped POS PaymentIntent：

```http
POST /v1/pos/payment-intents
```

```json
{
  "bindingId": "bind_coffee",
  "storeId": "tokyo-store-001",
  "terminalId": "pos-07",
  "terminalNonce": "nonce-1",
  "orderId": "POS-1001"
}
```

响应包含 `paymentIntent` 和 `qr` payload。`terminalNonce` 会按 merchant/store/terminal 保存，用于防重放。

### 短链

创建直播或活动短链：

```http
POST /v1/short-links/payment-intents
```

```json
{
  "bindingId": "bind_coffee",
  "slug": "live-drop",
  "baseUrl": "https://pay.example",
  "channel": "livestream",
  "orderId": "LIVE-1001"
}
```

解析短链：

```http
GET /v1/short-links/live-drop
```

POS QR 和短链都会回到同一套 `PaymentIntent`、settlement proof、webhook、audit log 和 commerce mark-as-paid 模型。

本地 POS console 可以在 pilot run 中注册 terminal、创建 POS QR payload、创建短链，并刷新 PaymentIntent 状态。
