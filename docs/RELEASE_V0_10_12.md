# RedeemLoop v0.10.12 Release Notes

## English

v0.10.12 adds public release privacy checks before beta publication.

### Changed

- `pnpm beta:release:gate` now fails when the public release notes contain obvious secret-like material.
- The gate checks for API keys, webhook secrets, bearer tokens, private keys, WooCommerce consumer secrets, Shopify/Xverse tokens, and GitHub tokens.
- `pnpm beta:evidence:summary` no longer writes absolute local filesystem paths into public evidence summaries.

### Verification

- `node --check scripts/beta-release-gate.mjs`
- `node --check scripts/create-beta-release-summary.mjs`
- Temporary release notes containing a RedeemLoop API key failed the release gate with `release.notes.secrets`.
- Temporary clean release notes passed the new secret check.
- Temporary out-of-tree manifest summary did not leak the full local path.
- `corepack pnpm verify`

### Remaining Beta Gap

This release privacy gate reduces publication risk but does not replace real certification. Docker Compose smoke, production readiness, funded EVM wallet, and WooCommerce test-store artifacts still need to be produced before beta publication.

## 中文

v0.10.12 新增 beta 发布前的公开 release 隐私检查。

### 变更

- `pnpm beta:release:gate` 现在会在公开 release notes 含有明显 secret-like material 时失败。
- Gate 会检查 API key、webhook secret、bearer token、私钥、WooCommerce consumer secret、Shopify/Xverse token 和 GitHub token。
- `pnpm beta:evidence:summary` 不再把本机绝对文件路径写入公开 evidence summary。

### 验证

- `node --check scripts/beta-release-gate.mjs`
- `node --check scripts/create-beta-release-summary.mjs`
- 临时 release notes 含 RedeemLoop API key 时，会以 `release.notes.secrets` 失败。
- 临时干净 release notes 可以通过新增 secret 检查。
- 临时仓库外 manifest 生成 summary 时，没有泄露完整本机路径。
- `corepack pnpm verify`

### 剩余 Beta 缺口

该 release privacy gate 可以降低公开发布风险，但不能替代真实认证。Docker Compose smoke、production readiness、funded EVM wallet 和 WooCommerce test-store artifact 仍需真实产出后，才能发布 beta。
