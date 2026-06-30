# RedeemLoop v0.10.17 Release Notes

## English

v0.10.17 tightens the final beta release gate so the GitHub Actions Docker Compose smoke evidence path cannot be accidentally removed before publication.

### Changed

- `pnpm beta:release:gate` now checks `.github/workflows/beta-compose-smoke.yml`.
- The gate requires the workflow to be manually dispatchable, install with a frozen lockfile, build the workspace, run `pnpm --silent beta:smoke:compose -- --json`, validate the JSON output, and upload the `redeemloop-compose-smoke-evidence` artifact.
- Beta readiness docs now state that the release gate verifies the compose-smoke evidence workflow in addition to CI and Pages workflows.

### Verification

- `node --check scripts/beta-release-gate.mjs`
- `pnpm --silent beta:release:gate -- --help`
- Example-manifest release gate run confirmed `github.beta_compose_smoke` passes while intentionally missing placeholder evidence still fails.

### Remaining Beta Gap

This release-gate hardening does not create external evidence by itself. The compose-smoke workflow still needs to run on GitHub Actions, and funded EVM wallet plus WooCommerce live test-store artifacts still need to be produced.

## 中文

v0.10.17 收紧最终 beta release gate，避免 GitHub Actions Docker Compose smoke evidence 路径在发布前被误删或退化。

### 变更

- `pnpm beta:release:gate` 现在会检查 `.github/workflows/beta-compose-smoke.yml`。
- Gate 要求该 workflow 可手动触发，使用 frozen lockfile 安装，构建 workspace，运行 `pnpm --silent beta:smoke:compose -- --json`，校验 JSON 输出，并上传 `redeemloop-compose-smoke-evidence` artifact。
- Beta readiness 文档现在说明 release gate 除了 CI 和 Pages workflow，也会校验 compose-smoke evidence workflow。

### 验证

- `node --check scripts/beta-release-gate.mjs`
- `pnpm --silent beta:release:gate -- --help`
- 使用 example manifest 运行 release gate，确认 `github.beta_compose_smoke` 通过，同时故意缺失的 placeholder evidence 仍然失败。

### 剩余 Beta 缺口

这次 release-gate hardening 本身不会生成外部证据。仍需实际运行 GitHub Actions compose-smoke workflow，并继续产出 funded EVM wallet 与 WooCommerce live test-store artifacts。
