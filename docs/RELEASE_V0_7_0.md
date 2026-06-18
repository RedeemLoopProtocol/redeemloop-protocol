# RedeemLoop v0.7.0

## English

RedeemLoop v0.7.0 adds Fractal and Inscription/NFT adapter alpha boundaries.

### Added

- `createMockFractalRuneIndexerAdapter(...)`.
- `createMockFractalInscriptionAdapter(...)`.
- `MockVoucherOwnershipAdapter`.
- Generic ownership proof and transfer proof boundaries for inscription, ERC-721, and ERC-1155 assets.
- Mocked adapter tests for Fractal Rune, Fractal inscription, and NFT voucher proof flows.
- Bilingual Fractal and Inscription/NFT alpha guide.

### Verification

- `pnpm --filter @redeemloop/adapters lint && pnpm --filter @redeemloop/adapters test`

### Known Limits

- Fractal and inscription/NFT support is alpha only.
- No live Fractal wallet or indexer certification was run.
- RedeemLoop still does not mint NFTs, create inscriptions, custody assets, price tokens, or operate a secondary market.

## 中文

RedeemLoop v0.7.0 新增 Fractal 和 Inscription/NFT adapter alpha boundaries。

### 新增

- `createMockFractalRuneIndexerAdapter(...)`。
- `createMockFractalInscriptionAdapter(...)`。
- `MockVoucherOwnershipAdapter`。
- 面向 inscription、ERC-721 和 ERC-1155 资产的通用 ownership proof 与 transfer proof boundary。
- 新增 Fractal Rune、Fractal inscription 和 NFT voucher proof flows 的 mocked adapter tests。
- 新增双语 Fractal 和 Inscription/NFT alpha guide。

### 验证

- `pnpm --filter @redeemloop/adapters lint && pnpm --filter @redeemloop/adapters test`

### 已知限制

- Fractal 和 inscription/NFT 支持仅为 alpha。
- 当前没有执行 live Fractal wallet 或 indexer certification。
- RedeemLoop 仍然不 mint NFT、不创建 inscription、不托管资产、不定价 token，也不运营二级市场。
