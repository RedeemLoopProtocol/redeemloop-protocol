# RedeemLoop v0.4.0 Release Notes

## English

RedeemLoop v0.4.0 is the Bitcoin Rune Interface Alpha release.

This version adds:

- `BitcoinRuneWalletAdapter` interfaces for UniSat and Xverse style wallet integration.
- `RuneIndexerAdapter` and `MockRuneIndexerAdapter`.
- Rune balance, UTXO, and transfer proof boundaries.
- `buildRuneTransferPsbtRequest` in `@redeemloop/adapters`.
- `transfer.bitcoin.psbtBase64` on Rune PaymentIntent transfer requests.
- SDK `BitcoinRunePsbtRequest` response type.
- Bilingual Rune alpha boundary docs at `docs/BITCOIN_RUNE_ALPHA.md`.

Known limits:

- Alpha only; not certified against live UniSat, Xverse, or Rune indexer flows.
- The PSBT payload is a fixture boundary for adapter integration tests, not a production PSBT engine.
- RedeemLoop still does not etch Runes, inscribe Ordinals, mint NFTs, custody assets, price tokens, or route secondary markets.

## 中文

RedeemLoop v0.4.0 是 Bitcoin Rune Interface Alpha 版本。

这一版新增：

- 面向 UniSat / Xverse 风格钱包集成的 `BitcoinRuneWalletAdapter` interfaces。
- `RuneIndexerAdapter` 和 `MockRuneIndexerAdapter`。
- Rune balance、UTXO 和 transfer proof 边界。
- `@redeemloop/adapters` 中新增 `buildRuneTransferPsbtRequest`。
- Rune PaymentIntent transfer request 返回 `transfer.bitcoin.psbtBase64`。
- SDK 新增 `BitcoinRunePsbtRequest` 响应类型。
- 双语 Rune alpha 边界文档：`docs/BITCOIN_RUNE_ALPHA.md`。

已知限制：

- 当前仅为 alpha，尚未通过真实 UniSat、Xverse 或 Rune indexer flow 认证。
- PSBT payload 是 adapter integration test 的 fixture boundary，不是生产级 PSBT engine。
- RedeemLoop 仍不 etch Rune、不 inscribe Ordinal、不 mint NFT、不托管资产、不做 token 定价、不做二级市场路由。
