# RedeemLoop v0.10.29 Release Notes

## English

v0.10.29 makes the beta release preflight workflow reuse the shared evidence artifact download command.

### Changed

- Updated `.github/workflows/beta-release-preflight.yml` to call `pnpm beta:evidence:download` for selected evidence workflow run IDs.
- The workflow still continues to generate and upload a preflight report when a selected artifact cannot be downloaded; failed downloads are emitted as GitHub Actions warnings.
- Tightened `pnpm beta:release:gate` so the beta release preflight workflow must use the shared artifact download command and all four run ID mappings.
- Updated the beta readiness guide and roadmap.

### Verification

- `node --check scripts/beta-release-gate.mjs`
- `corepack pnpm --silent beta:release:gate -- --manifest docs/examples/beta-evidence.manifest.example.json --json`
- Workflow text checks for `pnpm --silent beta:evidence:download`, `--compose-run-id`, `--production-run-id`, `--evm-run-id`, and `--woocommerce-run-id`.
- `git diff --check` on the changed files.

### Remaining Beta Gap

This release reduces duplicated workflow logic, but it does not create live funded-wallet or WooCommerce evidence. The first public beta still requires the commerce certification API key, funded EVM wallet certification evidence, live WooCommerce mark-as-paid evidence, and generated public-safe bilingual beta release notes.

## 中文

v0.10.29 让 beta release preflight workflow 复用统一的 evidence artifact 下载命令。

### 变更

- 更新 `.github/workflows/beta-release-preflight.yml`，改为通过 `pnpm beta:evidence:download` 处理选定的 evidence workflow run IDs。
- 当选定 artifact 下载失败时，该 workflow 仍会继续生成并上传 preflight report；下载失败会以 GitHub Actions warning 形式输出。
- 收紧 `pnpm beta:release:gate`：beta release preflight workflow 必须使用统一 artifact download 命令，并覆盖四类 run ID 映射。
- 更新 beta readiness guide 和 roadmap。

### 验证

- `node --check scripts/beta-release-gate.mjs`
- `corepack pnpm --silent beta:release:gate -- --manifest docs/examples/beta-evidence.manifest.example.json --json`
- 检查 workflow 文本包含 `pnpm --silent beta:evidence:download`、`--compose-run-id`、`--production-run-id`、`--evm-run-id` 和 `--woocommerce-run-id`。
- 对变更文件运行 `git diff --check`。

### 剩余 Beta 缺口

本版本减少重复 workflow 逻辑，但不会生成 live funded-wallet 或 WooCommerce evidence。首个公开 beta 仍需要 commerce certification API key、funded EVM wallet certification evidence、真实 WooCommerce mark-as-paid evidence，以及生成后的公开安全双语 beta release notes。
