# Changelog

## Unreleased

No unreleased changes yet.

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
