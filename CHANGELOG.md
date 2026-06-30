# Changelog

## Unreleased

### Changed

- Added snapshot-backed Postgres persistence for the API through `REDEEMLOOP_DATABASE_URL`.
- Added the `redeemloop_api_snapshots` migration and Docker Compose Postgres service without exposing a host database port.
- Updated environment validation so production accepts managed Postgres persistence and warns when file storage is used as a fallback.
- Added a standalone webhook worker process for draining due delivery records through the API.
- Added webhook delivery lease fields and `processing` status so concurrent workers do not duplicate due delivery attempts.
- Added outbound webhook request timeout configuration and worker settings to the sandbox environment and Docker Compose path.
- Added webhook operations diagnostics for delivery status counts, stale `processing` leases, worker drain heartbeat, and recommended actions.
- Added Merchant Admin visibility for webhook diagnostics.
- Added `pnpm beta:check` and `pnpm beta:check:production` to collect API, persistence, worker, EVM RPC, and Shopify readiness evidence before beta release.
- Added `pnpm beta:smoke:compose` to run the Docker Compose API/Postgres/worker/console smoke path on Docker-enabled machines.
- Added `pnpm beta:evidence:check` and a beta evidence manifest example for validating external certification artifacts before release.
- Added `pnpm beta:evidence:init` to create a local, Git-ignored beta evidence scaffold with intentionally failing placeholders.
- Added `pnpm beta:evidence:evm` to generate funded EVM wallet certification evidence from read-only RPC receipt checks.
- Added `pnpm beta:evidence:commerce` to generate WooCommerce/Shopify mark-as-paid certification evidence from RedeemLoop API results.
- Tightened commerce beta evidence validation so dry-run artifacts cannot pass production beta certification.
- Added `pnpm beta:evidence:summary` to generate public-safe bilingual beta release evidence notes from validated artifacts.
- Added `pnpm beta:release:gate` for the final beta release gate across evidence, bilingual release notes, README links, CI/Pages workflow presence, and workspace version consistency.
- Tightened `pnpm beta:release:gate` so public release notes fail on obvious API key, webhook secret, token, private-key, WooCommerce secret, or GitHub token leaks.
- Updated `pnpm beta:evidence:summary` to avoid writing absolute local filesystem paths into public release notes.
- Moved pnpm security overrides from the deprecated root `package.json` `pnpm` field to `pnpm-workspace.yaml`.
- Added a beta release gate check for active pnpm workspace overrides.
- Added a beta release gate frozen lockfile check so package/lockfile drift is caught before publication.
- Added default `/v1` API rate limiting with runtime diagnostics and 429 retry headers.
- Tightened production CORS/rate-limit readiness checks and environment validation.
- Made `pnpm beta:smoke:compose -- --json` safe for direct JSON evidence capture.
- Added a manual GitHub Actions workflow for Docker Compose smoke evidence generation.
- Tightened `pnpm beta:release:gate` so the beta compose-smoke evidence workflow must be present and artifact-producing before release.
- Added a manual GitHub Actions workflow for production readiness evidence generation using the `REDEEMLOOP_EVM_RPC_URLS` repository secret.
- Tightened `pnpm beta:release:gate` so the production-readiness evidence workflow must be present and artifact-producing before release.
- Added manual GitHub Actions workflows for funded EVM wallet and WooCommerce mark-as-paid certification evidence.
- Tightened `pnpm beta:release:gate` so the EVM wallet and WooCommerce certification workflows must be present before release.
- Aligned the example beta evidence manifest release-note path with the scaffolded `evidence/RELEASE_BETA.md` path.
- Tightened `pnpm beta:evidence:summary` so `--out` must match the manifest `releaseNotes.path` unless explicitly overridden.
- Added a bilingual beta release execution plan that states the remaining live-evidence blockers before the first public beta.
- Added `pnpm beta:release:preflight` to summarize missing beta evidence artifacts and optional GitHub secret-name checks before the final release gate.
- Added a manual GitHub Actions workflow for beta release preflight reports from existing evidence workflow artifacts.
- Hardened the beta release preflight workflow so downloaded evidence artifacts overwrite scaffold placeholders safely and still produce a report when an optional artifact download fails.
- Tightened beta evidence validation so WooCommerce mark-as-paid evidence must preserve settlement identity fields and match the funded EVM evidence across PaymentIntent, chain ID, transaction hash, voucher token, receiver, and amount.
- Made the WooCommerce certification workflow require the settlement transaction hash and added a release-gate check for that requirement.
- Added `pnpm beta:evidence:init -- --missing-only` to restore a missing local evidence manifest or placeholder files without overwriting existing evidence artifacts.
- Added a bilingual beta operator runbook for GitHub secret setup, funded EVM evidence, WooCommerce evidence, release-note generation, final gate execution, and GitHub Release publication.
- Tightened the beta evidence and release gates so public Markdown release artifacts fail when they contain full EVM addresses or transaction hashes.
- Added `pnpm beta:evidence:download` to safely download selected GitHub Actions evidence artifacts into the local ignored evidence folder by workflow run ID.
- Added `pnpm beta:version:prepare` to dry-run or apply a consistent workspace package version before the strict beta release gate.
- Added bilingual beta readiness guide at `docs/BETA_READINESS.md`.
- Reworked the official website from a construction/status page into a merchant-facing product homepage.
- Replaced the hero copy with formal voucher payment positioning and moved pilot limitations below the product story.
- Added merchant onboarding, use-case, integration, developer, and pilot-readiness sections for the public site.
- Switched the Next app build scripts to webpack mode and removed remaining Google Fonts runtime fetches from the POS console so restricted environments can build offline.

### 中文说明

- 新增基于 `REDEEMLOOP_DATABASE_URL` 的 API Postgres snapshot 持久化。
- 新增 `redeemloop_api_snapshots` migration，并在 Docker Compose 中加入 Postgres 服务；不向宿主机暴露数据库端口。
- 更新环境检查：生产模式支持托管 Postgres 持久化；仅使用文件存储时给出 fallback 警告。
- 新增独立 webhook worker 进程，通过 API drain 到期 delivery record。
- 新增 webhook delivery lease 字段和 `processing` 状态，避免多个 worker 重复投递同一条到期 delivery。
- 新增出站 webhook 请求超时配置，并把 worker 变量接入 sandbox 环境和 Docker Compose 路径。
- 新增 webhook 运维诊断，覆盖 delivery 状态统计、stale `processing` lease、worker drain heartbeat 和 recommended actions。
- Merchant Admin 新增 webhook diagnostics 可见性。
- 新增 `pnpm beta:check` 和 `pnpm beta:check:production`，用于在 beta 发布前采集 API、persistence、worker、EVM RPC 和 Shopify readiness evidence。
- 新增 `pnpm beta:smoke:compose`，用于在有 Docker 的机器上运行 API/Postgres/worker/console Docker Compose smoke 路径。
- 新增 `pnpm beta:evidence:check` 和 beta evidence manifest 示例，用于发布前校验外部 certification artifacts。
- 新增 `pnpm beta:evidence:init`，用于生成本地、被 Git 忽略、且默认无法通过的 beta evidence scaffold。
- 新增 `pnpm beta:evidence:evm`，用于通过只读 RPC receipt check 生成 funded EVM wallet certification evidence。
- 新增 `pnpm beta:evidence:commerce`，用于根据 RedeemLoop API 结果生成 WooCommerce/Shopify mark-as-paid certification evidence。
- 收紧 commerce beta evidence validation，dry-run artifact 不能通过 production beta certification。
- 新增 `pnpm beta:evidence:summary`，用于根据已校验 artifact 生成适合公开发布的双语 beta release evidence notes。
- 新增 `pnpm beta:release:gate`，用于在 beta 发布前统一检查 evidence、双语 release notes、README 链接、CI/Pages workflow 和 workspace version 一致性。
- 收紧 `pnpm beta:release:gate`：公开 release notes 中出现明显 API key、webhook secret、token、私钥、WooCommerce secret 或 GitHub token 时会失败。
- 更新 `pnpm beta:evidence:summary`，避免把本机绝对文件路径写入公开 release notes。
- 将 pnpm security overrides 从 root `package.json` 中已废弃的 `pnpm` 字段迁移到 `pnpm-workspace.yaml`。
- 新增 beta release gate 检查，确认 pnpm workspace overrides 处于有效配置位置。
- 新增 beta release gate 的 frozen lockfile 检查，在发布前发现 package/lockfile 漂移。
- 新增默认 `/v1` API rate limiting，包含 runtime diagnostics 和 429 retry headers。
- 收紧 production CORS/rate-limit readiness checks 和环境验证。
- 让 `pnpm beta:smoke:compose -- --json` 可以安全地直接重定向为 JSON evidence。
- 新增用于生成 Docker Compose smoke evidence 的手动 GitHub Actions workflow。
- 收紧 `pnpm beta:release:gate`：发布前必须存在可生成 artifact 的 beta compose-smoke evidence workflow。
- 新增用于生成 production readiness evidence 的手动 GitHub Actions workflow，通过 `REDEEMLOOP_EVM_RPC_URLS` 仓库 secret 注入 EVM RPC。
- 收紧 `pnpm beta:release:gate`：发布前必须存在可生成 artifact 的 production-readiness evidence workflow。
- 新增用于生成 funded EVM wallet 和 WooCommerce mark-as-paid certification evidence 的手动 GitHub Actions workflow。
- 收紧 `pnpm beta:release:gate`：发布前必须存在 EVM wallet 和 WooCommerce certification workflow。
- 将示例 beta evidence manifest 的 release-note 路径对齐到 scaffold 使用的 `evidence/RELEASE_BETA.md`。
- 新增双语 beta 发布施工计划，明确首个公开 beta 前剩余的 live-evidence 阻断项。
- 收紧 `pnpm beta:evidence:summary`：除非显式覆盖，否则 `--out` 必须与 manifest 中的 `releaseNotes.path` 一致。
- 新增 `pnpm beta:release:preflight`，用于在最终 release gate 前汇总缺失的 beta evidence artifact，并可选检查 GitHub secret 名称。
- 新增用于生成 beta release preflight report 的手动 GitHub Actions workflow，可从已有 evidence workflow artifacts 汇总状态。
- 加固 beta release preflight workflow：下载的 evidence artifacts 可以安全覆盖 scaffold placeholders，且可选 artifact 下载失败时仍会生成报告。
- 收紧 beta evidence validation：WooCommerce mark-as-paid evidence 必须保留 settlement identity 字段，并与 funded EVM evidence 在 PaymentIntent、chain ID、transaction hash、voucher token、receiver 和 amount 上一致。
- WooCommerce certification workflow 现在必须填写 settlement transaction hash，并新增 release-gate 检查防止该要求被放松。
- 新增 `pnpm beta:evidence:init -- --missing-only`，可在不覆盖已有 evidence artifact 的情况下恢复缺失的本地 evidence manifest 或占位文件。
- 新增双语 beta 发布操作手册，覆盖 GitHub secret 设置、funded EVM evidence、WooCommerce evidence、release-note 生成、最终 gate 和 GitHub Release 发布。
- 收紧 beta evidence 和 release gates：公开 Markdown release artifact 中出现完整 EVM 地址或交易哈希时会失败。
- 新增 `pnpm beta:evidence:download`，可按 workflow run ID 把指定 GitHub Actions evidence artifacts 安全下载到本地被 Git 忽略的 evidence 目录。
- 新增 `pnpm beta:version:prepare`，用于在 strict beta release gate 前 dry-run 或写入一致的 workspace package version。
- 新增双语 beta readiness 指南：`docs/BETA_READINESS.md`。
- 将官网从施工说明/工程状态页升级为面向商户的正式产品官网首页。
- 重写首屏价值主张，把 pilot 限制下沉到产品叙事之后。
- 新增商户接入、应用场景、集成、开发者和 pilot 状态区块。
- Next app 构建脚本切换到 webpack，并移除 POS console 剩余 Google Fonts 远程字体依赖，便于受限环境离线构建。

## v0.9.3 - 2026-06-18

### Changed

- Applied the supplied RedeemLoop VI assets to the official website without redrawing or recoloring the brand elements.
- Added original VI image assets and extracted transparent SVG logo mark/wordmark assets under `apps/site/public/vi`.
- Split the website into pure-language pages: `/` for Chinese and `/en` for English.
- Kept the English website free of Chinese visible text and Chinese-bearing VI board imagery.
- Updated the website palette to the VI colors: `#0D1B2A`, `#0A7B6E`, `#DFF3EF`, and `#F3F6F9`.
- Updated the website typography, navigation, hero, scenario panels, and visual gallery to match the supplied VI direction without remote font fetch dependency.

### 中文说明

- 按提供的 RedeemLoop VI 素材装修官网，不重绘、不改色品牌元素。
- 在 `apps/site/public/vi` 新增原始 VI 图片素材，并提取透明底 SVG logo mark / wordmark 资产。
- 官网拆成纯语种页面：`/` 中文版，`/en` 英文版。
- 英文官网不显示中文文字，也不展示带中文内容的 VI 版式图。
- 官网色板更新为 VI 色：`#0D1B2A`、`#0A7B6E`、`#DFF3EF`、`#F3F6F9`。
- 官网字体、导航、首屏、场景面板和视觉图库更新为提供的 VI 方向，并移除远程字体下载构建依赖。

## v0.9.2 - 2026-06-18

### Fixed

- GitHub Pages workflow now requests Pages enablement through `actions/configure-pages`.
- React and widget package tests now prebuild `@redeemloop/core`, `@redeemloop/adapters`, and `@redeemloop/sdk`, so clean CI environments can resolve workspace package entry points.

### 中文说明

- GitHub Pages workflow 现在会通过 `actions/configure-pages` 请求启用 Pages。
- React 和 widget 包测试前会预构建 `@redeemloop/core`、`@redeemloop/adapters` 和 `@redeemloop/sdk`，避免干净 CI 环境找不到 workspace package 入口。

## v0.9.1 - 2026-06-18

### Added

- Static official website app at `apps/site`.
- Bilingual website content with a language toggle.
- First-screen merchant scenario model for product checkout, POS QR, livestream short-link, and merchant operations.
- Readiness matrix for EVM, WooCommerce, Shopify, Bitcoin Rune, Fractal, inscription, and NFT paths.
- GitHub Pages deployment workflow at `.github/workflows/pages.yml`.
- Website and custom-domain guide at `docs/WEBSITE_AND_PAGES.md`.
- Root scripts `pnpm site:dev` and `pnpm site:build`.

### 中文说明

- 新增静态官网应用：`apps/site`。
- 官网支持中英文双语内容和页面内语言切换。
- 首屏新增商户应用场景模型，覆盖商品页 checkout、POS QR、直播短链和商户运营后台。
- 新增 EVM、WooCommerce、Shopify、Bitcoin Rune、Fractal、Inscription、NFT 路径的可用度矩阵。
- 新增 GitHub Pages 部署 workflow：`.github/workflows/pages.yml`。
- 新增官网和自定义域名指南：`docs/WEBSITE_AND_PAGES.md`。
- 根目录新增 `pnpm site:dev` 和 `pnpm site:build` 脚本。

## v0.9.0 - 2026-06-18

### Added

- Hosted payment pages at `/s/[slug]` and `/pay/[intentId]`.
- Token-scoped public payment session API for short-link and POS QR checkout.
- POS QR and short-link creation responses now include `checkoutToken` and hosted checkout URLs.
- SDK helpers for public session lookup, wallet connect, transfer request, broadcast, and trusted EVM recheck.
- Public session tests covering merchant API key protection and customer-side payment flow.

### 中文说明

- 新增 `/s/[slug]` 和 `/pay/[intentId]` hosted payment pages。
- 新增面向短链和 POS QR checkout 的 token-scoped public payment session API。
- POS QR 和短链创建响应新增 `checkoutToken` 和 hosted checkout URL。
- SDK 新增 public session lookup、钱包连接、转账请求、broadcast 和可信 EVM recheck helper。
- 新增 public session 测试，覆盖商户 API key 保护和用户侧支付流程。

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
