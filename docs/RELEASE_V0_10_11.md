# RedeemLoop v0.10.11 Release Notes

## English

v0.10.11 adds public-safe beta release evidence summary generation.

### Added

- `pnpm beta:evidence:summary` generates bilingual Markdown release evidence notes from the beta evidence manifest.
- The command validates all non-release-note artifacts before generating the summary.
- The generated summary redacts wallet addresses, transaction hashes, store URLs, and order identifiers for public GitHub Release use.

### Verification

- `node --check scripts/create-beta-release-summary.mjs`
- `node scripts/create-beta-release-summary.mjs --help`
- `corepack pnpm --silent beta:evidence:summary -- --help`
- Temporary complete manifest generated a bilingual public-safe release evidence summary.
- The generated summary passed `pnpm beta:evidence:check` as the release-notes artifact.
- Invalid non-release-note evidence was rejected.
- `corepack pnpm verify`

### Remaining Beta Gap

The command does not create real external certification evidence. Docker Compose smoke, production readiness, funded EVM wallet, and WooCommerce test-store artifacts still need to be produced before a beta release can be claimed as production-certified.

## 中文

v0.10.11 新增适合公开发布的 beta release evidence summary 生成能力。

### 新增

- `pnpm beta:evidence:summary` 会根据 beta evidence manifest 生成双语 Markdown release evidence notes。
- 该命令会在生成 summary 前校验所有非 release-note artifact。
- 生成的 summary 会截短钱包地址、交易哈希、店铺 URL 和订单标识，便于放入公开 GitHub Release。

### 验证

- `node --check scripts/create-beta-release-summary.mjs`
- `node scripts/create-beta-release-summary.mjs --help`
- `corepack pnpm --silent beta:evidence:summary -- --help`
- 临时完整 manifest 成功生成适合公开发布的双语 release evidence summary。
- 生成后的 summary 作为 release-notes artifact 通过了 `pnpm beta:evidence:check`。
- 非 release-note evidence 无效时会被拒绝。
- `corepack pnpm verify`

### 剩余 Beta 缺口

该命令不会生成真实外部认证证据。Docker Compose smoke、production readiness、funded EVM wallet 和 WooCommerce test-store artifact 仍需真实产出后，才能声明 production-certified beta。
