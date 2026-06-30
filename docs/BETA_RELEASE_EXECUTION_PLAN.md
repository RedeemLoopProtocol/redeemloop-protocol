# RedeemLoop Beta Release Execution Plan

## English

This document tracks the remaining distance from the current alpha/pilot implementation to the first public beta release.

For the step-by-step GitHub UI and command sequence, use [Beta Operator Runbook](BETA_OPERATOR_RUNBOOK.md).

### Current Distance

As of v0.10.25, the codebase has the release tooling needed for a public beta, but the beta cannot be claimed as production-certified yet.

The remaining distance is narrow and evidence-bound:

- 2 required live certification artifacts are missing.
- 1 final public-safe release evidence summary is missing.
- 1 required GitHub secret for commerce certification is missing.
- No known core Phase 0 code blocker remains in the release gate.

The release gate is intentionally still failing until those artifacts exist.

The latest local preflight on July 1, 2026, after restoring the missing local manifest with `pnpm beta:evidence:init -- --missing-only`, returned `5 pass`, `1 warn`, and `6 fail` when both GitHub secret and secret-env checks were enabled. The passing checks cover manifest loading, compose smoke evidence, production-readiness evidence, repository selection, and the `REDEEMLOOP_EVM_RPC_URLS` secret. The failures are the expected blockers: missing funded EVM evidence, missing WooCommerce evidence, missing beta release notes, missing commerce certification secret in GitHub, missing local injected commerce secret, and the aggregate evidence validator failure caused by those missing inputs.

### Already Ready

- Phase 0 product boundary: Asset Binding, Voucher Tender, PaymentIntent, receipt confirmation, and commerce mark-as-paid.
- EVM ERC-20 wallet transfer request and receipt recheck for Ethereum, BNB Smart Chain, Polygon PoS, and Arbitrum One.
- Merchant vault model, signed vault ownership challenge, settlement proof submission, and idempotent mark-as-paid flow.
- WooCommerce sandbox gateway and RedeemLoop commerce confirmation API.
- Postgres-backed API persistence, standalone webhook worker, delivery leases, retries, diagnostics, and audit logs.
- Public sandbox, Docker Compose smoke check, production-readiness check, and GitHub Actions evidence workflows.
- Bilingual README, website, readiness guide, release notes, and release gate.

### Hard Beta Blockers

| Blocker | Required Evidence | Status |
|---------|-------------------|--------|
| Funded EVM wallet payment | `evidence/evm-wallet-certification.json` generated from a real ERC-20 voucher transfer receipt | Missing |
| WooCommerce live mark-as-paid | `evidence/woocommerce-certification.json` generated from a real test-store order confirmation | Missing |
| Public beta evidence notes | `evidence/RELEASE_BETA.md` generated after all required private artifacts validate | Missing |
| Commerce certification secret | GitHub repository secret `REDEEMLOOP_COMMERCE_CERTIFICATION_API_KEY` | Missing |

Shopify live support is optional for the first beta. Bitcoin Rune, Fractal, inscription, and NFT paths must remain adapter or certification-track claims unless separate live evidence is attached.

### Operator Inputs Needed

- A test ERC-20 voucher asset on one supported EVM chain.
- A payer wallet with enough voucher balance and enough native gas.
- A merchant receiving vault address controlled by the merchant.
- A real transaction hash for a voucher transfer into that merchant vault.
- A WooCommerce test store with the RedeemLoop Voucher gateway configured.
- A real WooCommerce test order that can safely be marked paid.
- A RedeemLoop merchant API key for the certification run.
- GitHub repository secrets:
  - `REDEEMLOOP_EVM_RPC_URLS`
  - `REDEEMLOOP_COMMERCE_CERTIFICATION_API_KEY`

### Execution Plan

0. Freeze the beta claim.
   - Claim only production-certified EVM ERC-20 voucher payment plus WooCommerce mark-as-paid when the matching evidence passes.
   - Keep Shopify optional.
   - Keep Bitcoin Rune, Fractal, inscription, and NFT support as adapter/certification-track claims.
   - Do not publish a beta tag while any required artifact is still a placeholder or missing.

1. Configure the remaining release secret.
   - Set `REDEEMLOOP_COMMERCE_CERTIFICATION_API_KEY` in the GitHub repository.
   - Use a merchant-scoped RedeemLoop API key for the certification deployment.
   - Re-run the beta release preflight and confirm the secret check passes.

2. Run the funded EVM voucher payment.
   - Use the hosted payment page, React pay button, widget, or local certification console.
   - Broadcast one real ERC-20 voucher transfer into the merchant vault.
   - Record chain ID, wallet name/version, PaymentIntent ID, transaction hash, payer, receiver, token contract, and amount.

3. Generate funded EVM evidence.
   - Run the **Beta EVM Wallet Certification Evidence** workflow.
   - Download `evm-wallet-certification.json`.
   - Place it at `evidence/evm-wallet-certification.json`.

4. Run WooCommerce live mark-as-paid certification.
   - Create or select a safe WooCommerce test order.
   - Confirm settlement through RedeemLoop.
   - Run the **Beta WooCommerce Certification Evidence** workflow.
   - Download `woocommerce-certification.json`.
   - Place it at `evidence/woocommerce-certification.json`.

5. Validate the private beta evidence folder.
   - Keep `compose-smoke.json` and `beta-readiness-production.json` from the passing GitHub Actions runs.
   - Optionally run **Beta Release Preflight Evidence** with the completed evidence workflow run IDs.
   - Use `pnpm beta:evidence:download -- --compose-run-id <run> --production-run-id <run> --evm-run-id <run> --woocommerce-run-id <run>` to copy completed workflow artifacts into `evidence/`.
   - Run `pnpm beta:release:preflight -- --manifest evidence/beta-evidence.manifest.json --github --repo RedeemLoopProtocol/redeemloop-protocol`.
   - Run `pnpm beta:evidence:check -- --manifest evidence/beta-evidence.manifest.json`.

6. Generate the public-safe bilingual release summary.
   - Run `pnpm beta:evidence:summary -- --manifest evidence/beta-evidence.manifest.json --out evidence/RELEASE_BETA.md`.
   - Re-run the evidence check.

7. Prepare and gate the beta version.
   - Choose the beta tag.
   - Run `pnpm beta:version:prepare -- --release <beta-version>`.
   - Run `pnpm beta:version:prepare -- --release <beta-version> --write`.
   - Run `pnpm beta:release:gate -- --manifest evidence/beta-evidence.manifest.json --release <beta-version> --require-version-match`.
   - Optionally run **Beta Release Gate Evidence** with the four required evidence workflow run IDs and confirm `beta-release-gate.json` has zero failures.

8. Publish the first public beta.
   - Push the version commit and tag.
   - Create the GitHub Release.
   - Paste the public-safe content from `evidence/RELEASE_BETA.md`.
   - Do not attach private evidence artifacts unless they have been reviewed and redacted.

### Production Gap Closure Plan

| Stage | Gap | Construction Task | Done When |
|-------|-----|-------------------|-----------|
| 0 | Release claim discipline | Lock the first beta scope to EVM + WooCommerce only | Public docs avoid uncertified Shopify/Rune/Fractal/NFT production claims |
| 1 | Missing commerce secret | Add `REDEEMLOOP_COMMERCE_CERTIFICATION_API_KEY` in GitHub Actions secrets | Preflight secret check passes |
| 2 | Missing funded EVM evidence | Execute one real ERC-20 voucher transfer and run the EVM certification workflow | `evidence/evm-wallet-certification.json` passes validation |
| 3 | Missing WooCommerce evidence | Mark one safe WooCommerce test order paid through RedeemLoop and run the commerce workflow | `evidence/woocommerce-certification.json` passes validation and is not dry-run |
| 4 | Missing public release notes | Generate the public-safe bilingual summary from validated private evidence | `evidence/RELEASE_BETA.md` exists, is bilingual, and is redacted |
| 5 | Final release gate | Prepare beta version, run strict gate, push tag, publish GitHub Release | `beta:release:gate --require-version-match` and main CI pass |

### Beta Acceptance Criteria

- `corepack pnpm verify` passes locally and in GitHub Actions.
- Main CI passes after the beta version commit.
- `pnpm beta:evidence:check` passes with real artifacts.
- `pnpm beta:release:gate -- --require-version-match` passes.
- Public release notes contain separate English and Chinese sections.
- Public release notes do not expose API keys, webhook secrets, private keys, full store URLs, full wallet addresses, or unredacted transaction metadata.

### First Beta Claim

The first beta may claim:

- Non-custodial EVM ERC-20 voucher payment support for a certified transaction.
- Merchant-side receiving vault confirmation.
- PaymentIntent-based receipt confirmation.
- WooCommerce mark-as-paid certification for a live test order.
- Public sandbox and beta readiness tooling.

The first beta must not claim:

- Production-certified Shopify support unless optional Shopify evidence is added.
- Production-certified Bitcoin Rune, Fractal, inscription, or NFT settlement.
- Custody, token issuance, Rune etching, Ordinal inscription, NFT minting, token pricing, or secondary-market services.

## 中文

本文档记录当前 alpha/pilot 实现距离首个公开 beta 发布还差什么。

如需按照 GitHub UI 和命令行逐步执行，请使用 [Beta Operator Runbook](BETA_OPERATOR_RUNBOOK.md)。

### 当前距离

截至 v0.10.25，代码库已经具备公开 beta 所需的发布工具链，但还不能声明为 production-certified beta。

剩余距离很窄，主要是证据缺口：

- 还缺 2 个必需的真实认证 artifact。
- 还缺 1 份最终公开版 release evidence summary。
- 还缺 1 个用于 commerce certification 的 GitHub secret。
- 当前 release gate 中没有已知 Phase 0 核心代码阻断项。

Release gate 现在仍然失败，这是有意设计；只有真实 artifact 就位后才应通过。

2026-07-01 在使用 `pnpm beta:evidence:init -- --missing-only` 恢复缺失的本地 manifest 后，最新本地 preflight 结果为：在同时启用 GitHub secret 和 secret-env 检查时，`5 pass`、`1 warn`、`6 fail`。已通过项包括 manifest 加载、compose smoke evidence、production-readiness evidence、仓库选择以及 `REDEEMLOOP_EVM_RPC_URLS` secret。失败项是预期阻断：缺 funded EVM evidence、缺 WooCommerce evidence、缺 beta release notes、GitHub 中缺 commerce certification secret、本地未注入 commerce secret，以及由这些缺失输入导致的 evidence validator 汇总失败。

### 已经具备

- Phase 0 产品边界：Asset Binding、Voucher Tender、PaymentIntent、收券确认和电商 mark-as-paid。
- 面向 Ethereum、BNB Smart Chain、Polygon PoS、Arbitrum One 的 EVM ERC-20 钱包转账请求和 receipt recheck。
- 商户 vault 模型、签名式 vault ownership challenge、settlement proof 提交，以及幂等 mark-as-paid flow。
- WooCommerce sandbox gateway 和 RedeemLoop commerce confirmation API。
- 基于 Postgres 的 API persistence、独立 webhook worker、delivery lease、重试、diagnostics 和 audit logs。
- Public sandbox、Docker Compose smoke check、production-readiness check，以及 GitHub Actions evidence workflows。
- 中英文 README、官网、readiness guide、release notes 和 release gate。

### Beta 硬性阻断项

| 阻断项 | 必需证据 | 状态 |
|--------|----------|------|
| Funded EVM wallet payment | 从真实 ERC-20 提货券转账 receipt 生成 `evidence/evm-wallet-certification.json` | 缺失 |
| WooCommerce live mark-as-paid | 从真实测试店铺订单确认生成 `evidence/woocommerce-certification.json` | 缺失 |
| 公开 beta evidence notes | 所有必需私有 artifact 通过校验后生成 `evidence/RELEASE_BETA.md` | 缺失 |
| Commerce certification secret | GitHub 仓库 secret `REDEEMLOOP_COMMERCE_CERTIFICATION_API_KEY` | 缺失 |

首个 beta 中，Shopify live support 是可选声明。Bitcoin Rune、Fractal、inscription 和 NFT 路径必须保持 adapter 或 certification-track 口径，除非另附真实 live evidence。

### 需要准备的操作输入

- 一份部署在支持链上的测试 ERC-20 提货券资产。
- 一个有足够提货券余额、且有足够原生 gas 的付款钱包。
- 一个由商户控制的收券 vault 地址。
- 一笔真实转入该商户 vault 的提货券交易哈希。
- 一个已经配置 RedeemLoop Voucher gateway 的 WooCommerce 测试店铺。
- 一个可以安全标记为 paid 的 WooCommerce 测试订单。
- 用于认证运行的 RedeemLoop merchant API key。
- GitHub 仓库 secrets：
  - `REDEEMLOOP_EVM_RPC_URLS`
  - `REDEEMLOOP_COMMERCE_CERTIFICATION_API_KEY`

### 施工顺序

0. 冻结 beta 声明范围。
   - 首个 beta 只声明通过证据认证的 EVM ERC-20 提货券支付和 WooCommerce mark-as-paid。
   - Shopify 保持可选声明。
   - Bitcoin Rune、Fractal、inscription 和 NFT 保持 adapter / certification-track 口径。
   - 任一必需 artifact 仍为 placeholder 或缺失时，不发布 beta tag。

1. 配置剩余发布 secret。
   - 在 GitHub 仓库中设置 `REDEEMLOOP_COMMERCE_CERTIFICATION_API_KEY`。
   - 使用认证部署中的 merchant-scoped RedeemLoop API key。
   - 重新运行 beta release preflight，确认 secret check 通过。

2. 执行 funded EVM 提货券支付。
   - 使用 hosted payment page、React pay button、widget，或本地 certification console。
   - 广播一笔真实 ERC-20 提货券转账到商户 vault。
   - 记录 chain ID、wallet name/version、PaymentIntent ID、transaction hash、payer、receiver、token contract 和 amount。

3. 生成 funded EVM evidence。
   - 运行 **Beta EVM Wallet Certification Evidence** workflow。
   - 下载 `evm-wallet-certification.json`。
   - 放入 `evidence/evm-wallet-certification.json`。

4. 执行 WooCommerce live mark-as-paid 认证。
   - 创建或选择一个安全的 WooCommerce 测试订单。
   - 通过 RedeemLoop 确认 settlement。
   - 运行 **Beta WooCommerce Certification Evidence** workflow。
   - 下载 `woocommerce-certification.json`。
   - 放入 `evidence/woocommerce-certification.json`。

5. 校验私有 beta evidence 目录。
   - 保留已通过 GitHub Actions 生成的 `compose-smoke.json` 和 `beta-readiness-production.json`。
   - 可以用已完成的 evidence workflow run ID 运行 **Beta Release Preflight Evidence**。
   - 使用 `pnpm beta:evidence:download -- --compose-run-id <run> --production-run-id <run> --evm-run-id <run> --woocommerce-run-id <run>` 把已完成 workflow artifacts 写入 `evidence/`。
   - 运行 `pnpm beta:release:preflight -- --manifest evidence/beta-evidence.manifest.json --github --repo RedeemLoopProtocol/redeemloop-protocol`。
   - 运行 `pnpm beta:evidence:check -- --manifest evidence/beta-evidence.manifest.json`。

6. 生成公开安全的双语 release summary。
   - 运行 `pnpm beta:evidence:summary -- --manifest evidence/beta-evidence.manifest.json --out evidence/RELEASE_BETA.md`。
   - 再次运行 evidence check。

7. 准备并执行 beta version gate。
   - 选择 beta tag。
   - 运行 `pnpm beta:version:prepare -- --release <beta-version>`。
   - 运行 `pnpm beta:version:prepare -- --release <beta-version> --write`。
   - 运行 `pnpm beta:release:gate -- --manifest evidence/beta-evidence.manifest.json --release <beta-version> --require-version-match`。
   - 可选运行 **Beta Release Gate Evidence**，填入四个必需 evidence workflow run IDs，并确认 `beta-release-gate.json` 没有失败项。

8. 发布首个公开 beta。
   - 推送 version commit 和 tag。
   - 创建 GitHub Release。
   - 粘贴 `evidence/RELEASE_BETA.md` 中的公开安全内容。
   - 除非已经人工检查并脱敏，不要上传私有 evidence artifacts。

### 生产缺口补齐施工计划

| 阶段 | 缺口 | 施工任务 | 完成标准 |
|------|------|----------|----------|
| 0 | 发布声明口径 | 首个 beta 范围锁定为 EVM + WooCommerce | 公开文档不声明未认证的 Shopify/Rune/Fractal/NFT production support |
| 1 | 缺 commerce secret | 在 GitHub Actions secrets 中添加 `REDEEMLOOP_COMMERCE_CERTIFICATION_API_KEY` | Preflight secret check 通过 |
| 2 | 缺 funded EVM evidence | 执行一笔真实 ERC-20 提货券转账，并运行 EVM certification workflow | `evidence/evm-wallet-certification.json` 通过校验 |
| 3 | 缺 WooCommerce evidence | 通过 RedeemLoop 把一个安全 WooCommerce 测试订单标记为 paid，并运行 commerce workflow | `evidence/woocommerce-certification.json` 通过校验，且不是 dry-run |
| 4 | 缺公开 release notes | 用已校验私有 evidence 生成公开安全的双语 summary | `evidence/RELEASE_BETA.md` 存在、双语、且已脱敏 |
| 5 | 最终发布 gate | 准备 beta version，运行 strict gate，推送 tag，发布 GitHub Release | `beta:release:gate --require-version-match` 和 main CI 通过 |

### Beta 验收标准

- `corepack pnpm verify` 在本地和 GitHub Actions 中通过。
- Beta version commit 合并后，main CI 通过。
- `pnpm beta:evidence:check` 使用真实 artifacts 后通过。
- `pnpm beta:release:gate -- --require-version-match` 通过。
- 公开 release notes 同时包含独立英文和中文部分。
- 公开 release notes 不暴露 API key、webhook secret、private key、完整店铺 URL、完整钱包地址或未脱敏交易元数据。

### 首个 Beta 可声明范围

首个 beta 可以声明：

- 已认证交易范围内的非托管 EVM ERC-20 提货券支付支持。
- 商户侧收券 vault 确认。
- 基于 PaymentIntent 的收券确认。
- 针对真实测试订单的 WooCommerce mark-as-paid 认证。
- Public sandbox 和 beta readiness tooling。

首个 beta 不应声明：

- Production-certified Shopify support，除非补充可选 Shopify evidence。
- Production-certified Bitcoin Rune、Fractal、inscription 或 NFT settlement。
- 托管资产、发行 token、etch Rune、inscribe Ordinal、mint NFT、token pricing 或二级市场服务。
