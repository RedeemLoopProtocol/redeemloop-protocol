# RedeemLoop v0.10.27 Release Notes

## English

v0.10.27 tightens public release metadata privacy checks for beta publication.

### Changed

- `pnpm beta:evidence:check` now rejects Markdown release artifacts that contain full EVM addresses or transaction hashes.
- `pnpm beta:release:gate` now performs the same public metadata check on the final release notes artifact.
- Failure details show redacted samples only, so the validator output does not reprint the full metadata it rejected.
- The beta readiness guide now documents that the final release gate checks both secret-like material and unredacted EVM chain metadata.

### Verification

- `node --check scripts/check-beta-evidence.mjs`
- `node --check scripts/beta-release-gate.mjs`
- Temporary release notes containing a full EVM transaction hash failed `pnpm beta:evidence:check` with `artifact.releaseNotes.public_metadata`.
- Temporary release notes containing a full EVM address failed `pnpm beta:release:gate` with `release.notes.public_metadata`.
- Generated public-safe beta release summary output remained compatible with the new metadata check.

### Remaining Beta Gap

This release reduces publication privacy risk, but it does not create live evidence. The first public beta still requires the commerce certification API key, funded EVM wallet certification evidence, live WooCommerce mark-as-paid evidence, and generated public-safe bilingual beta release notes.

## 中文

v0.10.27 收紧 beta 发布前的公开 release 元数据隐私检查。

### 变更

- `pnpm beta:evidence:check` 现在会拒绝包含完整 EVM 地址或交易哈希的 Markdown release artifact。
- `pnpm beta:release:gate` 现在会对最终 release notes artifact 执行同样的公开元数据检查。
- 失败详情只显示脱敏样本，validator 输出不会重新打印被拒绝的完整元数据。
- beta readiness guide 已更新，说明最终 release gate 会同时检查 secret-like material 和未脱敏的 EVM 链上元数据。

### 验证

- `node --check scripts/check-beta-evidence.mjs`
- `node --check scripts/beta-release-gate.mjs`
- 临时 release notes 含完整 EVM transaction hash 时，`pnpm beta:evidence:check` 会以 `artifact.releaseNotes.public_metadata` 失败。
- 临时 release notes 含完整 EVM 地址时，`pnpm beta:release:gate` 会以 `release.notes.public_metadata` 失败。
- 生成的公开安全 beta release summary 仍兼容新的元数据检查。

### 剩余 Beta 缺口

本版本降低公开发布隐私风险，但不会生成 live evidence。首个公开 beta 仍需要 commerce certification API key、funded EVM wallet certification evidence、真实 WooCommerce mark-as-paid evidence，以及生成后的公开安全双语 beta release notes。
