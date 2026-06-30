# RedeemLoop v0.10.28 Release Notes

## English

v0.10.28 adds local GitHub Actions evidence artifact download tooling for beta release preparation.

### Changed

- Added `pnpm beta:evidence:download`.
- The command downloads selected GitHub Actions artifacts by workflow run ID:
  - `redeemloop-compose-smoke-evidence`
  - `redeemloop-production-readiness-evidence`
  - `redeemloop-evm-wallet-certification-evidence`
  - `redeemloop-woocommerce-certification-evidence`
- Existing non-placeholder evidence files are protected by default. Use `--force` only when intentionally replacing a real artifact.
- Updated the beta readiness guide, beta operator runbook, and beta release execution plan to use the new command.

### Verification

- `node --check scripts/download-beta-evidence-artifacts.mjs`
- `pnpm beta:evidence:download -- --help`
- Temporary evidence scaffold plus real successful GitHub Actions run IDs downloaded compose-smoke and production-readiness artifacts successfully.
- A second download into the same temp directory failed without `--force`, proving non-placeholder overwrite protection.
- `pnpm beta:evidence:check -- --manifest <temp>/beta-evidence.manifest.json` showed compose and production readiness passing while live EVM, WooCommerce, and release-note placeholders still failed as expected.

### Remaining Beta Gap

This release reduces artifact handling risk, but it does not create live funded-wallet or WooCommerce evidence. The first public beta still requires the commerce certification API key, funded EVM wallet certification evidence, live WooCommerce mark-as-paid evidence, and generated public-safe bilingual beta release notes.

## 中文

v0.10.28 新增本地 GitHub Actions evidence artifact 下载工具，用于 beta 发布准备。

### 变更

- 新增 `pnpm beta:evidence:download`。
- 该命令可按 workflow run ID 下载指定 GitHub Actions artifacts：
  - `redeemloop-compose-smoke-evidence`
  - `redeemloop-production-readiness-evidence`
  - `redeemloop-evm-wallet-certification-evidence`
  - `redeemloop-woocommerce-certification-evidence`
- 默认保护已经存在的非 placeholder evidence 文件。只有在明确要替换真实 artifact 时，才使用 `--force`。
- 已更新 beta readiness guide、beta operator runbook 和 beta release execution plan，改用该命令。

### 验证

- `node --check scripts/download-beta-evidence-artifacts.mjs`
- `pnpm beta:evidence:download -- --help`
- 在临时 evidence scaffold 中使用真实成功的 GitHub Actions run ID，成功下载 compose-smoke 和 production-readiness artifacts。
- 再次下载到同一临时目录且不带 `--force` 时失败，证明非 placeholder 覆盖保护生效。
- `pnpm beta:evidence:check -- --manifest <temp>/beta-evidence.manifest.json` 显示 compose 和 production readiness 通过，而 live EVM、WooCommerce 和 release-note placeholders 仍按预期失败。

### 剩余 Beta 缺口

本版本降低 artifact 处理风险，但不会生成 live funded-wallet 或 WooCommerce evidence。首个公开 beta 仍需要 commerce certification API key、funded EVM wallet certification evidence、真实 WooCommerce mark-as-paid evidence，以及生成后的公开安全双语 beta release notes。
