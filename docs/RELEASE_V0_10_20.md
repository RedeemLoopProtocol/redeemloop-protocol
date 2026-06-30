# RedeemLoop v0.10.20 Release Notes

## English

v0.10.20 tightens the final beta release-note path so the public-safe evidence summary is written to the same path declared by the evidence manifest.

### Changed

- The example beta evidence manifest now uses `evidence/RELEASE_BETA.md`, matching the scaffolded manifest and beta readiness guide.
- `pnpm beta:evidence:summary` now fails when `--out` differs from `manifest.artifacts.releaseNotes.path`, unless `--allow-output-mismatch` is explicitly passed.

### Verification

- `node --check scripts/create-beta-release-summary.mjs`
- `pnpm --silent beta:evidence:summary -- --help`
- Output mismatch guard fails when `--out` differs from the manifest release-notes path.
- Output mismatch override allows intentional diagnostic output.
- `corepack pnpm verify`

### Remaining Beta Gap

This release-note path hardening does not create live evidence. Funded EVM wallet and WooCommerce test-store artifacts are still required before generating the final beta release summary.

## 中文

v0.10.20 收紧最终 beta release notes 路径，确保 public-safe evidence summary 写入 evidence manifest 声明的同一路径。

### 变更

- 示例 beta evidence manifest 现在使用 `evidence/RELEASE_BETA.md`，与 scaffold manifest 和 beta readiness guide 保持一致。
- 当 `--out` 与 `manifest.artifacts.releaseNotes.path` 不一致时，`pnpm beta:evidence:summary` 现在会失败；只有显式传入 `--allow-output-mismatch` 才允许覆盖。

### 验证

- `node --check scripts/create-beta-release-summary.mjs`
- `pnpm --silent beta:evidence:summary -- --help`
- 当 `--out` 与 manifest release-notes path 不一致时，路径保护会失败。
- 显式传入 mismatch override 时，可用于诊断输出。
- `corepack pnpm verify`

### 剩余 Beta 缺口

这次 release-note path hardening 不会生成 live evidence。最终生成 beta release summary 前，仍需要 funded EVM wallet 和 WooCommerce test-store artifacts。
