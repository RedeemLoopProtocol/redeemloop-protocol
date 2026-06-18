# RedeemLoop v0.4.4

## English

RedeemLoop v0.4.4 moves ETH/BSC/Polygon/Arbitrum support from wallet integration beta toward pilot certification.

### Added

- EVM live certification console at `/evm-live-certification`.
- Merchant-facing EVM wallet error taxonomy in `@redeemloop/adapters`.
- React Pay Button `onEvent` stream for intent, wallet, transaction, settlement, and completion events.
- Script widget wallet events including `redeemloop:wallet_connected` and structured `redeemloop:error` codes.
- API endpoint `GET /v1/diagnostics/evm-rpc` for chain-specific RPC health checks.
- SDK helper `getEvmRpcDiagnostics()`.
- Bilingual EVM live certification runbook.

### Changed

- Auto-send EVM flows now connect the wallet first and use the connected account for transaction submission and settlement recheck.
- EVM receipt provider injection now receives the chain-specific RPC URL selected from `EVM_RPC_URLS`.
- The live certification path remains explicit about beta vs pilot-ready wording.

### Verification

- `pnpm --filter @redeemloop/adapters lint && pnpm --filter @redeemloop/adapters test`
- `pnpm --filter @redeemloop/sdk lint && pnpm --filter @redeemloop/sdk test`
- `pnpm --filter @redeemloop/react lint && pnpm --filter @redeemloop/react test`
- `pnpm --filter @redeemloop/widget lint && pnpm --filter @redeemloop/widget test`
- `pnpm --filter @redeemloop/api lint && pnpm --filter @redeemloop/api test`
- `pnpm --filter @redeemloop/pos-verifier lint && pnpm --filter @redeemloop/pos-verifier test && pnpm --filter @redeemloop/pos-verifier build`

### Known Limits

- This release adds certification tooling; it does not itself certify every wallet/network pair.
- Funded live tests are still required for MetaMask, OKX Wallet, Trust Wallet, Coinbase Wallet, and any `pay.aifund.com`-referenced flow.
- RedeemLoop remains non-issuing and does not custody assets, price tokens, mint NFTs, etch Runes, or operate a secondary market.

## 中文

RedeemLoop v0.4.4 将 ETH/BSC/Polygon/Arbitrum 支持从 wallet integration beta 推向 pilot certification。

### 新增

- 新增 EVM live certification console：`/evm-live-certification`。
- `@redeemloop/adapters` 新增面向商户的钱包错误分类。
- React Pay Button 新增 `onEvent` 事件流，覆盖 intent、wallet、transaction、settlement 和 completion。
- Script widget 新增钱包事件，包括 `redeemloop:wallet_connected` 和带 code 的结构化 `redeemloop:error`。
- API 新增 `GET /v1/diagnostics/evm-rpc`，用于按链检查 RPC 健康状态。
- SDK 新增 `getEvmRpcDiagnostics()`。
- 新增双语 EVM live certification runbook。

### 变更

- 自动 EVM 钱包发送流程现在会先连接钱包，并使用连接账户提交交易和做 settlement recheck。
- 注入式 EVM receipt provider 现在会收到通过 `EVM_RPC_URLS` 选择出的 chain-specific RPC URL。
- live certification 路径继续严格区分 beta 与 pilot-ready 表述。

### 验证

- `pnpm --filter @redeemloop/adapters lint && pnpm --filter @redeemloop/adapters test`
- `pnpm --filter @redeemloop/sdk lint && pnpm --filter @redeemloop/sdk test`
- `pnpm --filter @redeemloop/react lint && pnpm --filter @redeemloop/react test`
- `pnpm --filter @redeemloop/widget lint && pnpm --filter @redeemloop/widget test`
- `pnpm --filter @redeemloop/api lint && pnpm --filter @redeemloop/api test`
- `pnpm --filter @redeemloop/pos-verifier lint && pnpm --filter @redeemloop/pos-verifier test && pnpm --filter @redeemloop/pos-verifier build`

### 已知限制

- 本版本新增认证工具，不等于已经认证所有钱包 / 网络组合。
- MetaMask、OKX Wallet、Trust Wallet、Coinbase Wallet，以及任何参考 `pay.aifund.com` 的 flow，仍需要 funded live test。
- RedeemLoop 仍保持非发行边界：不托管资产、不做 token 定价、不 mint NFT、不 etch Rune、不运营二级市场。
