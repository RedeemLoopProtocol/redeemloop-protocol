# Fractal and Inscription/NFT Adapter Alpha

## English

RedeemLoop v0.7.0 adds adapter boundaries for Fractal Rune, Fractal inscription, and generic NFT/inscription voucher proofs.

### Scope

- `createMockFractalRuneIndexerAdapter(...)`.
- `createMockFractalInscriptionAdapter(...)`.
- `MockVoucherOwnershipAdapter`.
- Ownership proof boundary for `inscription`, `erc721`, and `erc1155` assets.
- Transfer proof boundary that maps ownership-style assets into `VoucherPaymentProof`.

These adapters are alpha and mocked. They are meant to stabilize interfaces for future live wallet/indexer integrations.

### Not Included

- Fractal live indexer certification.
- Fractal wallet transfer certification.
- Ordinal inscription creation.
- NFT minting.
- Custody, pricing, or secondary market behavior.

## 中文

RedeemLoop v0.7.0 新增 Fractal Rune、Fractal inscription，以及通用 NFT/inscription voucher proof 的 adapter boundary。

### 范围

- `createMockFractalRuneIndexerAdapter(...)`。
- `createMockFractalInscriptionAdapter(...)`。
- `MockVoucherOwnershipAdapter`。
- 面向 `inscription`、`erc721` 和 `erc1155` 资产的 ownership proof boundary。
- 将 ownership-style asset 映射为 `VoucherPaymentProof` 的 transfer proof boundary。

这些 adapter 仍是 alpha 和 mocked，用于稳定未来 live wallet/indexer integration 的接口。

### 不包含

- Fractal live indexer certification。
- Fractal wallet transfer certification。
- Ordinal inscription creation。
- NFT minting。
- Custody、pricing 或 secondary market 行为。
