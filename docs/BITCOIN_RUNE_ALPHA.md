# RedeemLoop Bitcoin Rune Interface Alpha

## English

RedeemLoop v0.4.0 starts Phase 1 with Bitcoin Rune interface alpha support.

Implemented:

- `BitcoinRuneWalletAdapter` interface for UniSat and Xverse style wallets.
- `RuneIndexerAdapter` interface and `MockRuneIndexerAdapter`.
- Rune balance, UTXO, and transfer proof boundaries.
- `buildRuneTransferPsbtRequest` for wallet-facing PSBT request fixtures.
- `transfer.bitcoin` response on `POST /v1/payment-intents/:intentId/transfer-requested` when the selected asset is a Rune and `runeUtxos` are provided.

Not implemented:

- Rune etching.
- Ordinal inscription.
- NFT minting.
- Custody.
- Token pricing.
- Secondary market routing.
- Production live-wallet or live-indexer certification.

Example request:

```http
POST /v1/payment-intents/:intentId/transfer-requested
```

```json
{
  "payerAddress": "bc1payer",
  "network": "testnet",
  "feeRate": 8,
  "changeAddress": "bc1change",
  "runeUtxos": [
    {
      "txid": "tx_rune_1",
      "vout": 0,
      "value": 10000,
      "address": "bc1payer",
      "runeId": "840000:3",
      "amount": "12"
    }
  ]
}
```

The response includes `transfer.bitcoin.psbtBase64`. In v0.4.0 this is an alpha fixture boundary for wallet adapter integration tests, not a certified production PSBT engine.

## 中文

RedeemLoop v0.4.0 开始 Phase 1，新增 Bitcoin Rune interface alpha 支持。

已实现：

- 面向 UniSat / Xverse 风格钱包的 `BitcoinRuneWalletAdapter` interface。
- `RuneIndexerAdapter` interface 和 `MockRuneIndexerAdapter`。
- Rune balance、UTXO 和 transfer proof 边界。
- `buildRuneTransferPsbtRequest`，用于生成面向钱包的 PSBT request fixture。
- 当选中资产是 Rune 且请求提供 `runeUtxos` 时，`POST /v1/payment-intents/:intentId/transfer-requested` 会返回 `transfer.bitcoin`。

未实现：

- Rune etching。
- Ordinal inscription。
- NFT minting。
- 托管。
- Token 定价。
- 二级市场路由。
- 生产级真实钱包或真实索引器认证。

示例请求：

```http
POST /v1/payment-intents/:intentId/transfer-requested
```

```json
{
  "payerAddress": "bc1payer",
  "network": "testnet",
  "feeRate": 8,
  "changeAddress": "bc1change",
  "runeUtxos": [
    {
      "txid": "tx_rune_1",
      "vout": 0,
      "value": 10000,
      "address": "bc1payer",
      "runeId": "840000:3",
      "amount": "12"
    }
  ]
}
```

响应会包含 `transfer.bitcoin.psbtBase64`。在 v0.4.0 中它是用于 wallet adapter integration test 的 alpha fixture boundary，不是已认证的生产级 PSBT engine。
