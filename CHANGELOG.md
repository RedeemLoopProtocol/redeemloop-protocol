# Changelog

## Unreleased

No unreleased changes yet.

## v0.8.0 - 2026-06-18

### Added

- POS QR PaymentIntent API with terminal nonce replay protection.
- Short-link PaymentIntent API and slug resolver.
- SDK helpers for POS QR and short-link flows.
- Persistence for short links and terminal payment nonces.
- Terminal-scoped POS audit events.
- Bilingual POS QR and short-link pilot guide.

### 中文说明

- 新增 POS QR PaymentIntent API，支持 terminal nonce 防重放。
- 新增短链 PaymentIntent API 和 slug resolver。
- SDK 新增 POS QR 和短链流程 helper。
- 短链和 terminal payment nonce 支持持久化。
- 新增 terminal-scoped POS audit events。
- 新增双语 POS QR 和短链 pilot guide。

## v0.7.0 - 2026-06-18

### Added

- Fractal Rune mocked indexer adapter boundary.
- Fractal inscription mocked ownership/transfer adapter boundary.
- Generic inscription/ERC-721/ERC-1155 ownership proof adapter boundary.
- Mocked adapter tests for Fractal and NFT/inscription voucher proof flows.
- Bilingual Fractal and Inscription/NFT alpha guide.

### 中文说明

- 新增 Fractal Rune mocked indexer adapter boundary。
- 新增 Fractal inscription mocked ownership/transfer adapter boundary。
- 新增通用 inscription/ERC-721/ERC-1155 ownership proof adapter boundary。
- 新增 Fractal 和 NFT/inscription voucher proof flows 的 mocked adapter tests。
- 新增双语 Fractal 和 Inscription/NFT alpha guide。

## v0.6.0 - 2026-06-18

### Added

- Rune indexer failover adapter boundary.
- Rune proof failover attempt metadata.
- Rune settlement recheck `manualReviewOnIndexerError` recovery path.
- Rune manual-review API response for indexer lag/unavailability.
- Bilingual Rune production certification track guide.

### 中文说明

- 新增 Rune indexer failover adapter boundary。
- Rune proof 新增 failover attempt metadata。
- Rune settlement recheck 新增 `manualReviewOnIndexerError` 恢复路径。
- Indexer lag/unavailability 时，Rune API 可返回 manual-review 响应。
- 新增双语 Rune production certification track guide。

## v0.5.1 - 2026-06-18

### Added

- Shopify configuration diagnostics at `GET /v1/diagnostics/shopify`.
- SDK `getShopifyDiagnostics()`.
- Shopify Admin GraphQL success and user-error handling with mocked integration tests.
- Shopify order ID normalization to `gid://shopify/Order/...`.
- Bilingual Shopify adapter alpha guide.

### 中文说明

- 新增 Shopify 配置诊断：`GET /v1/diagnostics/shopify`。
- SDK 新增 `getShopifyDiagnostics()`。
- Shopify Admin GraphQL 成功响应和 user-error 处理，并加入 mocked integration tests。
- Shopify order ID 规范化为 `gid://shopify/Order/...`。
- 新增双语 Shopify adapter alpha guide。

## v0.5.0 - 2026-06-18

### Added

- Merchant admin console at `/merchant-admin`.
- API `GET /v1/payment-intents` with merchant, binding, status, and order filters.
- SDK `listPaymentIntents(...)`.
- Merchant admin pilot seed action for vault, entitlement, binding, and webhook setup.
- WooCommerce SKU-to-binding map.
- WooCommerce admin diagnostics for API base URL, merchant ID, default binding ID, and webhook endpoint.
- WooCommerce connection test for API credentials and webhook secret HMAC self-test.
- WooCommerce order-received diagnostics for order status, PaymentIntent ID, and selected binding.
- Bilingual merchant admin and WooCommerce pilot guide.

### 中文说明

- 新增 merchant admin console：`/merchant-admin`。
- API 新增 `GET /v1/payment-intents`，支持按 merchant、binding、status、order 过滤。
- SDK 新增 `listPaymentIntents(...)`。
- Merchant admin 支持 seed pilot vault、entitlement、binding 和 webhook。
- WooCommerce 新增 SKU-to-binding map。
- WooCommerce 后台诊断显示 API base URL、merchant ID、default binding ID 和 webhook endpoint。
- WooCommerce 新增 API 凭证连接测试和 webhook secret HMAC 自检。
- WooCommerce order-received 页面新增订单状态、PaymentIntent ID 和所选 binding 诊断。
- 新增双语 merchant admin 和 WooCommerce pilot guide。

## v0.4.5 - 2026-06-18

### Added

- Signed EVM merchant vault ownership challenge endpoint.
- Real EVM vault signature verification through `verifyMessage`.
- PaymentIntent stale expiration cleanup endpoint.
- Merchant-scoped audit logs for vault verification, PaymentIntent state changes, settlement advancement, and expiration.
- Webhook delivery `drain-pending` endpoint for worker/cron operation.
- SDK helpers for vault challenge, stale expiration, webhook drain, and audit log listing.

### Changed

- PaymentIntents are automatically expired on API requests in merchant scope.
- Webhook delivery tests now cover the background-drain style path.
- Persistent sandbox snapshots now include audit logs.

### 中文说明

- 新增 EVM merchant vault ownership 签名 challenge endpoint。
- 通过 `verifyMessage` 执行真实 EVM vault 签名校验。
- 新增 PaymentIntent stale expiration cleanup endpoint。
- 新增商户级 audit logs，覆盖 vault verification、PaymentIntent 状态变化、settlement advancement 和 expiration。
- 新增 webhook delivery `drain-pending` endpoint，用于 worker/cron 运维。
- SDK 新增 vault challenge、stale expiration、webhook drain 和 audit log 查询 helpers。
- API 请求会在商户范围内自动清理过期 PaymentIntent。
- Webhook delivery 测试覆盖 background-drain 风格路径。
- 持久化 sandbox snapshot 现在包含 audit logs。

## v0.4.4 - 2026-06-18

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
- The public wording now keeps live wallet certification separate from general beta integration support.

### 中文说明

- 新增 EVM live certification console：`/evm-live-certification`。
- `@redeemloop/adapters` 新增面向商户的钱包错误分类。
- React Pay Button 新增 `onEvent` 事件流，覆盖 intent、wallet、transaction、settlement 和 completion。
- Script widget 新增钱包事件，包括 `redeemloop:wallet_connected` 和带 code 的结构化 `redeemloop:error`。
- API 新增 `GET /v1/diagnostics/evm-rpc`，用于按链检查 RPC 健康状态。
- SDK 新增 `getEvmRpcDiagnostics()`。
- 新增双语 EVM live certification runbook。
- 自动 EVM 钱包发送流程现在会先连接钱包，并使用连接账户提交交易和做 settlement recheck。
- 注入式 EVM receipt provider 现在会收到通过 `EVM_RPC_URLS` 选择出的 chain-specific RPC URL。
- 公开表述继续严格区分 live wallet certification 和 beta integration support。

## v0.4.3 - 2026-06-18

### Added

- EVM multi-chain wallet beta for Ethereum Mainnet, BNB Smart Chain, Polygon PoS, and Arbitrum One.
- Default EVM chain catalog with chain IDs, hex IDs, native currencies, RPC URLs, explorers, and aliases.
- EIP-1193 wallet adapter with `eth_requestAccounts`, `eth_chainId`, `wallet_switchEthereumChain`, `wallet_addEthereumChain`, and `eth_sendTransaction`.
- React Pay Button options `autoSendEvmTransaction`, `autoRecheckEvmSettlement`, `switchEvmChain`, and `evmProvider`.
- Script widget options `data-auto-send-evm-transaction`, `data-auto-recheck-evm-settlement`, and `data-switch-evm-chain`.
- Chain-specific trusted EVM recheck routing through `EVM_RPC_URLS`.
- Bilingual EVM multi-chain wallet integration guide.

### Changed

- EVM receipt recheck now selects a chain-specific RPC URL when `EVM_RPC_URLS` is configured.
- React and widget tests now cover wallet-sent ERC-20 transfers and trusted EVM recheck.

### 中文说明

- 新增 EVM multi-chain wallet beta，覆盖 Ethereum Mainnet、BNB Smart Chain、Polygon PoS 和 Arbitrum One。
- 新增默认 EVM chain catalog，包含 chain ID、hex chain ID、native currency、RPC URL、explorer 和 alias。
- 新增 EIP-1193 钱包 adapter，覆盖 `eth_requestAccounts`、`eth_chainId`、`wallet_switchEthereumChain`、`wallet_addEthereumChain` 和 `eth_sendTransaction`。
- React Pay Button 新增 `autoSendEvmTransaction`、`autoRecheckEvmSettlement`、`switchEvmChain` 和 `evmProvider`。
- Script widget 新增 `data-auto-send-evm-transaction`、`data-auto-recheck-evm-settlement` 和 `data-switch-evm-chain`。
- 可信 EVM recheck 支持通过 `EVM_RPC_URLS` 按 chainId 路由 RPC。
- 新增双语 EVM 多链钱包集成指南。
- EVM receipt recheck 在配置 `EVM_RPC_URLS` 后会选择对应 chainId 的 RPC URL。
- React 和 widget 测试覆盖钱包发起 ERC-20 转账与可信 EVM recheck。

## v0.4.2 - 2026-06-18

### Added

- API-level Rune settlement recheck endpoint: `POST /v1/settlement/rune/recheck/:intentId`.
- Configurable Rune indexer wiring through injected `RuneIndexerAdapter` or Xverse API env vars.
- Xverse API env config: `XVERSE_API_KEY`, `XVERSE_NETWORK`, and optional `XVERSE_API_BASE_URL`.
- SDK helper `recheckRuneSettlement`.
- API tests for successful trusted Rune recheck and missing indexer credential errors.
- Environment validation warnings for production deployments that plan to enable Rune settlement recheck.

### Changed

- Rune merchant flow can now progress from wallet txid to indexer-backed proof to `paid` without manual proof construction.
- Rune documentation now points real merchant flows to wallet-native transfer plus API-level recheck.

### 中文说明

- 新增 API-level Rune settlement recheck endpoint：`POST /v1/settlement/rune/recheck/:intentId`。
- 支持通过注入的 `RuneIndexerAdapter` 或 Xverse API 环境变量配置 Rune indexer。
- 新增 Xverse API 环境配置：`XVERSE_API_KEY`、`XVERSE_NETWORK` 和可选 `XVERSE_API_BASE_URL`。
- SDK 新增 `recheckRuneSettlement` helper。
- API 测试覆盖可信 Rune recheck 成功路径和缺少 indexer credentials 的错误路径。
- 环境检查会提示生产部署在启用 Rune settlement recheck 前配置 Xverse API key。
- Rune 商户流程现在可从钱包 txid 进入 indexer-backed proof，再推进到 `paid`，无需手动构造 proof。
- Rune 文档现在将真实商户流程指向钱包原生转账 + API-level recheck。

## v0.4.1 - 2026-06-18

### Added

- UniSat Rune wallet adapter factory with `requestAccounts`, `getPublicKey`, `getChain`/`getNetwork`, `sendRunes`, `signPsbt`, and `pushPsbt` integration surfaces.
- Xverse Sats Connect wallet adapter factory with `getAddresses`, `signPsbt`, and `runes_transfer` integration surfaces.
- Direct wallet-native Rune transfer helper through `requestRuneTransfer`.
- Explicit PSBT semantics: UniSat uses hex PSBTs; Xverse uses base64 PSBTs.
- Xverse API-backed Rune indexer adapter for balance, UTXO, and activity-based transfer proof lookup.
- Deterministic adapter tests for UniSat transfer payloads, Xverse transfer payloads, and Xverse indexer response mapping.
- Bilingual Bitcoin Rune real-usability plan.

### Changed

- Bitcoin Rune support is now documented as wallet/indexer beta integration support rather than a fixture-only alpha.
- The existing API `transfer.bitcoin.psbtBase64` remains clearly labeled as a PSBT fixture boundary, not a production PSBT engine.

### 中文说明

- 新增 UniSat Rune wallet adapter factory，覆盖 `requestAccounts`、`getPublicKey`、`getChain`/`getNetwork`、`sendRunes`、`signPsbt` 和 `pushPsbt` 集成表面。
- 新增 Xverse Sats Connect wallet adapter factory，覆盖 `getAddresses`、`signPsbt` 和 `runes_transfer` 集成表面。
- 新增通过 `requestRuneTransfer` 发起钱包原生 Rune 转账的 helper。
- 明确 PSBT 语义：UniSat 使用 hex PSBT，Xverse 使用 base64 PSBT。
- 新增基于 Xverse API 的 Rune indexer adapter，支持 balance、UTXO 和 activity-based transfer proof lookup。
- 新增确定性 adapter 测试，覆盖 UniSat 转账 payload、Xverse 转账 payload 和 Xverse indexer response mapping。
- 新增双语 Bitcoin Rune 真实可用度计划。
- Bitcoin Rune 支持现在表述为钱包/索引器 beta integration support，而不是仅有 fixture 的 alpha。
- 现有 API `transfer.bitcoin.psbtBase64` 仍明确标注为 PSBT fixture boundary，不是生产级 PSBT engine。

## v0.4.0 - 2026-06-18

### Added

- Bitcoin Rune interface alpha in `@redeemloop/adapters`.
- UniSat/Xverse-style `BitcoinRuneWalletAdapter` interfaces.
- `RuneIndexerAdapter` and `MockRuneIndexerAdapter` for balance, UTXO, and transfer proof boundaries.
- `buildRuneTransferPsbtRequest` for wallet-facing PSBT request fixtures.
- API `transfer.bitcoin` response for Rune PaymentIntents through `POST /v1/payment-intents/:intentId/transfer-requested`.
- SDK `BitcoinRunePsbtRequest` response type.
- Bilingual Bitcoin Rune alpha boundary documentation.

### 中文说明

- `@redeemloop/adapters` 新增 Bitcoin Rune interface alpha。
- 新增 UniSat/Xverse 风格的 `BitcoinRuneWalletAdapter` interfaces。
- 新增 `RuneIndexerAdapter` 和 `MockRuneIndexerAdapter`，覆盖 balance、UTXO 和 transfer proof 边界。
- 新增 `buildRuneTransferPsbtRequest`，用于面向钱包的 PSBT request fixture。
- Rune PaymentIntent 可通过 `POST /v1/payment-intents/:intentId/transfer-requested` 返回 API `transfer.bitcoin`。
- SDK 新增 `BitcoinRunePsbtRequest` 响应类型。
- 新增双语 Bitcoin Rune alpha 边界文档。

## v0.3.0 - 2026-06-18

### Added

- Public Merchant Sandbox with `Dockerfile`, `docker-compose.yml`, and `.env.example`.
- Production `start` scripts for the API service and Phase 0 console.
- Environment validation script with sandbox and production modes.
- `docs/PUBLIC_SANDBOX.md` with bilingual Docker/local sandbox steps and pilot checklist.
- `docs/API_REFERENCE.md` with bilingual endpoint reference.
- README links and quick-start commands for the public sandbox.

### 中文说明

- 新增 Public Merchant Sandbox：`Dockerfile`、`docker-compose.yml` 和 `.env.example`。
- API service 和 Phase 0 console 新增 production `start` script。
- 新增环境检查脚本，支持 sandbox 和 production 模式。
- 新增 `docs/PUBLIC_SANDBOX.md`，包含双语 Docker/本地 sandbox 步骤和 pilot checklist。
- 新增 `docs/API_REFERENCE.md`，提供双语 endpoint reference。
- README 新增 public sandbox 链接和快速开始命令。

## v0.2.5 - 2026-06-18

### Added

- Persistent webhook event outbox and delivery records for `payment_intent.paid`.
- Signed outbound webhook delivery attempts with `X-RedeemLoop-Event-Id`, `X-RedeemLoop-Delivery-Id`, timestamp, nonce, and HMAC signature headers.
- Delivery status APIs for listing events, listing deliveries, reading delivery details, manual attempts, and replay.
- Retry/backoff state with `failed` and `dead_letter` delivery statuses.
- SDK helpers for webhook events and delivery operations.
- API tests for event enqueue, signature verification, successful delivery, and replay.

### 中文说明

- 新增 `payment_intent.paid` 的持久化 webhook event outbox 和 delivery record。
- 新增出站 webhook 签名投递，包含 `X-RedeemLoop-Event-Id`、`X-RedeemLoop-Delivery-Id`、timestamp、nonce 和 HMAC signature headers。
- 新增 delivery status API：event 列表、delivery 列表、delivery 详情、手动 attempt 和 replay。
- 新增 retry/backoff 状态，以及 `failed`、`dead_letter` delivery 状态。
- SDK 新增 webhook event 和 delivery operations helper。
- API 测试覆盖 event 入队、签名校验、成功投递和 replay。

## v0.2.4 - 2026-06-18

### Added

- WooCommerce sandbox payment gateway plugin in `plugins/woocommerce/redeemloop-voucher-gateway.php`.
- WooCommerce admin settings for API Base URL, Merchant ID, API Key, Default Binding ID, Webhook Secret, and widget script URL.
- WooCommerce checkout `process_payment` flow that creates a RedeemLoop PaymentIntent and stores order metadata.
- WooCommerce REST webhook endpoint for RedeemLoop mark-paid callbacks with HMAC signature verification.
- `@redeemloop/widget` support for existing PaymentIntent IDs through `data-intent-id`.
- Bilingual WooCommerce plugin installation guide.

### 中文说明

- 新增 WooCommerce sandbox payment gateway 插件：`plugins/woocommerce/redeemloop-voucher-gateway.php`。
- WooCommerce 后台可配置 API Base URL、Merchant ID、API Key、Default Binding ID、Webhook Secret 和 widget script URL。
- WooCommerce checkout `process_payment` 会创建 RedeemLoop PaymentIntent 并写入订单 metadata。
- WooCommerce REST webhook endpoint 支持 RedeemLoop mark-paid callback，并校验 HMAC 签名。
- `@redeemloop/widget` 支持通过 `data-intent-id` 复用已有 PaymentIntent。
- 新增双语 WooCommerce 插件安装指南。

## v0.2.3 - 2026-06-18

### Added

- Trusted EVM ERC-20 receipt verification helper in `@redeemloop/adapters`.
- `POST /v1/settlement/evm/recheck/:intentId` to fetch/verify an ERC-20 transfer receipt and create a trusted proof.
- `broadcastTxid` tracking on PaymentIntent after `POST /v1/payment-intents/:intentId/broadcasted`.
- SDK `recheckEvmSettlement` method and response types.
- Configurable `EVM_MIN_CONFIRMATIONS` confirmation policy.
- Tests for ERC-20 receipt verification and trusted API settlement recheck.

### 中文说明

- 在 `@redeemloop/adapters` 中新增可信 EVM ERC-20 receipt 校验 helper。
- 新增 `POST /v1/settlement/evm/recheck/:intentId`，用于读取/校验 ERC-20 transfer receipt 并创建 trusted proof。
- `POST /v1/payment-intents/:intentId/broadcasted` 后会在 PaymentIntent 上记录 `broadcastTxid`。
- SDK 新增 `recheckEvmSettlement` 方法和响应类型。
- 新增可配置确认数策略 `EVM_MIN_CONFIRMATIONS`。
- 新增 ERC-20 receipt 校验和可信 API settlement recheck 测试。

## v0.2.2 - 2026-06-18

### Added

- File-backed sandbox persistence through `REDEEMLOOP_STORAGE_FILE`.
- Persistence coverage for merchants, merchant vaults, receiving addresses, commerce payments, entitlements, bindings, PaymentIntents, settlement proofs, proof idempotency, mark-as-paid idempotency, webhook endpoints, registered terminals, and legacy redemption submissions.
- Merchant-scoped API key enforcement through `REDEEMLOOP_API_KEYS`.
- API config response metadata for persistence and API-key auth status.
- Tests proving PaymentIntent/proof/idempotency recovery across API restarts.
- Tests proving missing or mismatched merchant API keys are rejected.

### 中文说明

- 通过 `REDEEMLOOP_STORAGE_FILE` 新增文件型 sandbox 持久化。
- 持久化覆盖 merchant、merchant vault、收券地址、commerce payment、entitlement、binding、PaymentIntent、settlement proof、proof 幂等、mark-as-paid 幂等、webhook endpoint、registered terminal 和 legacy redemption submission。
- 通过 `REDEEMLOOP_API_KEYS` 新增商户级 API key 校验。
- API config 响应新增 persistence 和 API-key auth 状态。
- 新增测试，证明 API 重启后可以恢复 PaymentIntent、proof 和幂等状态。
- 新增测试，证明缺失或错误商户 API key 会被拒绝。

## v0.2.1 - 2026-06-18

### Added

- `@redeemloop/react` with `RedeemLoopProvider`, `RedeemLoopPayButton`, and a tested merchant payment flow helper.
- `@redeemloop/widget` with script-tag style DOM mounting through `data-redeemloop-pay-button`.
- Expanded `@redeemloop/sdk` coverage for merchants, vaults, entitlements, bindings, PaymentIntent wallet/connect/select/check/transfer/broadcast/cancel, settlement recheck, receiving addresses, and webhook endpoints.
- Demo store page at `/demo-store` showing React and script widget merchant embeds.
- Configurable API embed CORS allowlist through `REDEEMLOOP_EMBED_ALLOWED_ORIGINS`, with localhost defaults for local development and verified merchant domains as dynamic allowed origins.
- Concrete EVM ERC-20 transfer request builder in `@redeemloop/adapters`.
- EVM ERC-20 balance check request builder and PaymentIntent check-balance API.
- `transfer.evm.transaction` response on `POST /v1/payment-intents/:intentId/transfer-requested` for wallet-ready ERC-20 `transfer(merchantVault, requiredAmount)` calls.
- Phase 0 console display for generated balance and transfer requests.

### 中文说明

- 新增 `@redeemloop/react`：包含 `RedeemLoopProvider`、`RedeemLoopPayButton` 和已测试的商户支付流程 helper。
- 新增 `@redeemloop/widget`：支持通过 `data-redeemloop-pay-button` 挂载 script-tag 风格 DOM widget。
- 扩展 `@redeemloop/sdk`：覆盖 merchant、vault、entitlement、binding、PaymentIntent 钱包连接/选资产/查余额/请求转账/广播/取消、settlement recheck、收券地址和 webhook endpoint。
- 新增 `/demo-store` 页面，同时展示 React 嵌入和 script widget 嵌入。
- API 新增可配置嵌入来源 allowlist：`REDEEMLOOP_EMBED_ALLOWED_ORIGINS`，本地默认允许 localhost，并支持已验证商户域名动态放行。
- 在 `@redeemloop/adapters` 中新增具体 EVM ERC-20 transfer request builder。
- 新增 EVM ERC-20 balance check request builder 和 PaymentIntent check-balance API。
- `POST /v1/payment-intents/:intentId/transfer-requested` 现在返回 `transfer.evm.transaction`，可直接用于钱包发起 ERC-20 `transfer(merchantVault, requiredAmount)`。
- Phase 0 控制台会展示生成的 balance request 和 transfer request。

## v0.2.0 - 2026-06-17

RedeemLoop Phase 0 has been realigned as a non-issuing voucher payment gateway.

### Added

- `@redeemloop/core` with v0.2 protocol types, validators, idempotency helpers, and the PaymentIntent state machine.
- `@redeemloop/adapters` with EVM, PSBT builder, wallet, and indexer adapter interfaces.
- `@redeemloop/sdk` with a TypeScript client for entitlements, bindings, PaymentIntents, and settlement proofs.
- v0.2 Fastify APIs for merchants, merchant vaults, entitlements, Asset Bindings, PaymentIntents, settlement proofs, and webhook endpoints.
- Receipt proof handling that advances PaymentIntents and triggers dry-run mark-as-paid adapters.
- v0.2 webhook endpoint test requests with `X-RedeemLoop-Timestamp`, `X-RedeemLoop-Nonce`, and HMAC signature headers.
- Local Phase 0 console for Asset Binding, Voucher Tender, PaymentIntent, receipt confirmation, and mark-as-paid demo flows.
- v0.2 docs, whitepaper, construction guide, API model, boundary document, integration guide, commerce adapter guide, and release notes.
- Bilingual English/Chinese README for the public release.

### Changed

- Public positioning changed from an issuance/redemption system to "bring your own voucher asset, RedeemLoop binds and settles."
- Commerce flow now centers on external voucher payment and mark-as-paid instead of commerce-order workaround language.
- The Solidity package is documented as an EVM ERC-20 voucher asset example, not a core issuance module.
- Legacy v0.1 relayer routes remain only as compatibility coverage while new integrations use `/v1/payment-intents` and `/v1/settlement/proofs`.

### Security

- Added validator coverage for voucher asset descriptors, bindings, PaymentIntents, and settlement proofs.
- Added proof idempotency keys and mark-as-paid idempotency keys.
- Commerce adapter metadata now carries `intentId` and generic `assetId`.
- Public docs clarify that RedeemLoop does not custody assets or private keys.

### Known Limitations

- Service state is still in-memory.
- Mark-as-paid adapters default to dry-run unless platform credentials are configured.
- EVM ERC-20 tender is the only implemented runtime path; Bitcoin, Fractal, Rune, and Inscription support is currently interface-level.
- Contracts are unaudited example code.

## v0.2.0 - 2026-06-17 中文说明

RedeemLoop Phase 0 已重新对齐为非发行型提货券支付网关。

### 新增

- `@redeemloop/core`：v0.2 协议类型、校验器、幂等 helper 和 PaymentIntent 状态机。
- `@redeemloop/adapters`：EVM、PSBT builder、钱包、索引器 adapter interfaces。
- `@redeemloop/sdk`：entitlement、binding、PaymentIntent、settlement proof 的 TypeScript client。
- v0.2 Fastify API：merchant、merchant vault、entitlement、Asset Binding、PaymentIntent、settlement proof、webhook endpoint。
- 收券 proof 处理：推进 PaymentIntent，并触发 dry-run mark-as-paid adapter。
- v0.2 webhook endpoint 测试请求：包含 `X-RedeemLoop-Timestamp`、`X-RedeemLoop-Nonce` 和 HMAC 签名头。
- 本地 Phase 0 控制台：Asset Binding、Voucher Tender、PaymentIntent、收券确认、mark-as-paid 演示。
- v0.2 文档、白皮书、施工文档、API 模型、边界文档、集成指南、电商适配指南和发布说明。
- 英文 + 中文 README。

### 变更

- 对外定位改为“厂商自带提货资产，RedeemLoop 做绑定与结算”。
- 电商流程以外部提货券支付和 mark-as-paid 为中心。
- Solidity 包被标记为 EVM ERC-20 提货资产示例，不是核心发行模块。
- 旧 v0.1 relayer 路由仅作为兼容覆盖保留，新集成使用 `/v1/payment-intents` 和 `/v1/settlement/proofs`。

### 安全

- 增加 voucher asset descriptor、binding、PaymentIntent、settlement proof 校验覆盖。
- 增加 proof 幂等 key 和 mark-as-paid 幂等 key。
- Commerce adapter metadata 现在携带 `intentId` 和通用 `assetId`。
- 公开文档明确 RedeemLoop 不托管资产或私钥。

### 已知限制

- 服务状态仍为内存存储。
- mark-as-paid adapter 默认 dry-run，除非配置平台凭证。
- 当前只有 EVM ERC-20 tender 是已实现运行路径；Bitcoin、Fractal、Rune、Inscription 当前为接口级支持。
- 合约是未审计示例代码。
