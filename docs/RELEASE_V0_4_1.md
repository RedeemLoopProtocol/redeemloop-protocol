# RedeemLoop v0.4.1 Release Notes

## English

RedeemLoop v0.4.1 upgrades Bitcoin Rune support from fixture-only alpha toward real merchant integration.

This version adds:

- UniSat wallet adapter factory using real wallet methods, including `sendRunes`, `signPsbt`, and `pushPsbt`.
- Xverse Sats Connect adapter factory using `getAddresses`, `signPsbt`, and `runes_transfer`.
- `requestRuneTransfer` helper for wallet-native Rune transfers to merchant receiving addresses.
- Explicit PSBT format separation: UniSat uses hex PSBTs; Xverse uses base64 PSBTs.
- Xverse API-backed Rune indexer adapter for balance, UTXO, and transfer proof lookup from activity data.
- Deterministic tests for UniSat wallet payloads, Xverse wallet payloads, and Xverse indexer response mapping.
- Bilingual real-usability plan at `docs/BITCOIN_RUNE_REAL_USABILITY.md`.

Known limits:

- This release has not been live-certified here with a funded UniSat wallet, funded Xverse wallet, real merchant Rune receiving address, or real Xverse API key.
- The API `transfer.bitcoin.psbtBase64` response remains a fixture boundary for adapter integration tests, not a production-grade PSBT builder.
- Rune support should be described as beta integration support until a pilot merchant completes the live checklist.
- RedeemLoop still does not etch Runes, inscribe Ordinals, mint NFTs, custody assets, price tokens, or route secondary markets.

## 中文

RedeemLoop v0.4.1 将 Bitcoin Rune 支持从仅有 fixture 的 alpha 推进到更接近真实商户集成的状态。

这一版新增：

- UniSat wallet adapter factory，使用真实钱包方法，包括 `sendRunes`、`signPsbt` 和 `pushPsbt`。
- Xverse Sats Connect adapter factory，使用 `getAddresses`、`signPsbt` 和 `runes_transfer`。
- 新增 `requestRuneTransfer` helper，用于把 Rune 通过钱包原生转账发送到商户收券地址。
- 明确 PSBT 格式边界：UniSat 使用 hex PSBT，Xverse 使用 base64 PSBT。
- 新增基于 Xverse API 的 Rune indexer adapter，可查询 balance、UTXO，并通过 activity data 查找 transfer proof。
- 新增确定性测试，覆盖 UniSat wallet payload、Xverse wallet payload 和 Xverse indexer response mapping。
- 新增双语真实可用度计划：`docs/BITCOIN_RUNE_REAL_USABILITY.md`。

已知限制：

- 当前 release 尚未在本环境中使用有余额的 UniSat 钱包、有余额的 Xverse 钱包、真实商户 Rune 收券地址或真实 Xverse API key 完成 live certification。
- API `transfer.bitcoin.psbtBase64` 响应仍是 adapter integration test 的 fixture boundary，不是生产级 PSBT builder。
- 在 pilot 商户完成 live checklist 前，Rune 支持应表述为 beta integration support。
- RedeemLoop 仍不 etch Rune、不 inscribe Ordinal、不 mint NFT、不托管资产、不做 token 定价、不做二级市场路由。
