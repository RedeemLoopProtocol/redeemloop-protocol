# RedeemLoop v0.10.22 Release Notes

## English

v0.10.22 adds a GitHub Actions beta release preflight workflow so release operators can collect existing evidence artifacts and produce a preflight report from the GitHub UI.

### Changed

- Added `.github/workflows/beta-release-preflight.yml`.
- The workflow initializes a local beta evidence manifest, optionally downloads selected evidence artifacts from workflow run IDs, checks required secret injection, runs `pnpm beta:release:preflight`, and uploads `beta-release-preflight.json`.
- `pnpm beta:release:preflight` now supports `--secret-env SECRET_NAME=ENV_VAR` for GitHub Actions secret-injection checks without printing secret values.
- `pnpm beta:release:gate` now checks that the beta release preflight workflow is present and artifact-producing.
- Beta readiness and execution-plan docs now describe the GitHub Actions preflight path.

### Verification

- `node --check scripts/beta-release-preflight.mjs`
- `node --check scripts/beta-release-gate.mjs`
- `pnpm --silent beta:release:preflight -- --help`
- `pnpm --silent beta:release:preflight -- --manifest docs/examples/beta-evidence.manifest.example.json --secret-env REDEEMLOOP_EVM_RPC_URLS=REDEEMLOOP_EVM_RPC_URLS --json`
- `pnpm --silent beta:release:gate -- --manifest docs/examples/beta-evidence.manifest.example.json --json`
- `corepack pnpm audit --audit-level moderate`
- `corepack pnpm verify`

### Remaining Beta Gap

The workflow does not create live evidence by itself. Funded EVM wallet evidence, WooCommerce test-store evidence, and final public beta release notes are still required.

## 中文

v0.10.22 新增 GitHub Actions beta release preflight workflow，让发布操作员可以在 GitHub UI 中汇总已有 evidence artifacts，并生成 preflight report。

### 变更

- 新增 `.github/workflows/beta-release-preflight.yml`。
- 该 workflow 会初始化本地 beta evidence manifest，根据 workflow run ID 可选下载指定 evidence artifacts，检查必需 secret 是否已注入，运行 `pnpm beta:release:preflight`，并上传 `beta-release-preflight.json`。
- `pnpm beta:release:preflight` 新增 `--secret-env SECRET_NAME=ENV_VAR`，用于在 GitHub Actions 中检查 secret 是否注入到环境变量，但不会打印 secret 值。
- `pnpm beta:release:gate` 现在会检查 beta release preflight workflow 是否存在且会上传 artifact。
- Beta readiness 和 execution-plan 文档已说明 GitHub Actions preflight 路径。

### 验证

- `node --check scripts/beta-release-preflight.mjs`
- `node --check scripts/beta-release-gate.mjs`
- `pnpm --silent beta:release:preflight -- --help`
- `pnpm --silent beta:release:preflight -- --manifest docs/examples/beta-evidence.manifest.example.json --secret-env REDEEMLOOP_EVM_RPC_URLS=REDEEMLOOP_EVM_RPC_URLS --json`
- `pnpm --silent beta:release:gate -- --manifest docs/examples/beta-evidence.manifest.example.json --json`
- `corepack pnpm audit --audit-level moderate`
- `corepack pnpm verify`

### 剩余 Beta 缺口

该 workflow 本身不会生成 live evidence。仍需要 funded EVM wallet evidence、WooCommerce test-store evidence 和最终公开 beta release notes。
