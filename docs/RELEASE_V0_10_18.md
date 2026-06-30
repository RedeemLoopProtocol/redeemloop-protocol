# RedeemLoop v0.10.18 Release Notes

## English

v0.10.18 adds a GitHub Actions path for production readiness evidence and protects that path in the final beta release gate.

### Added

- `.github/workflows/beta-production-readiness.yml` runs the Docker Compose stack, keeps it up, runs `pnpm beta:check:production -- --json`, validates the JSON output, stops Compose, and uploads `redeemloop-production-readiness-evidence`.
- Docker Compose now passes `EVM_RPC_URLS` into the API service when the environment variable is configured.
- The workflow reads `EVM_RPC_URLS` from the `REDEEMLOOP_EVM_RPC_URLS` repository secret so provider API keys are not committed to the repository.

### Changed

- `pnpm beta:release:gate` now checks that the production-readiness evidence workflow is present and artifact-producing.
- Beta readiness docs explain how to configure the EVM RPC secret and where to place the downloaded `beta-readiness-production.json` artifact.

### Verification

- `node --check scripts/beta-release-gate.mjs`
- `pnpm --silent beta:release:gate -- --help`
- Static workflow inspection for the production-readiness evidence workflow.
- Example-manifest release gate run confirmed `github.beta_production_readiness` passes while missing live artifacts still fail.
- `corepack pnpm verify`

### Remaining Beta Gap

The workflow still needs to be run with a real `REDEEMLOOP_EVM_RPC_URLS` repository secret. Funded EVM wallet and WooCommerce live test-store artifacts are still required before a production-certified beta claim.

## 中文

v0.10.18 新增通过 GitHub Actions 生成 production readiness evidence 的路径，并把该路径纳入最终 beta release gate。

### 新增

- `.github/workflows/beta-production-readiness.yml` 会启动 Docker Compose stack，保持服务运行，执行 `pnpm beta:check:production -- --json`，校验 JSON 输出，停止 Compose，并上传 `redeemloop-production-readiness-evidence`。
- Docker Compose 现在会在配置环境变量时，把 `EVM_RPC_URLS` 传入 API service。
- Workflow 从 `REDEEMLOOP_EVM_RPC_URLS` 仓库 secret 读取 `EVM_RPC_URLS`，避免把 provider API key 提交进仓库。

### 变更

- `pnpm beta:release:gate` 现在会检查 production-readiness evidence workflow 是否存在并能生成 artifact。
- Beta readiness 文档说明了如何配置 EVM RPC secret，以及下载后的 `beta-readiness-production.json` 应放到哪里。

### 验证

- `node --check scripts/beta-release-gate.mjs`
- `pnpm --silent beta:release:gate -- --help`
- 对 production-readiness evidence workflow 做静态检查。
- 使用 example manifest 运行 release gate，确认 `github.beta_production_readiness` 通过，同时缺失的真实 artifact 仍然失败。
- `corepack pnpm verify`

### 剩余 Beta 缺口

该 workflow 仍需要配置真实 `REDEEMLOOP_EVM_RPC_URLS` 仓库 secret 后运行。发布 production-certified beta 前，仍需要 funded EVM wallet 和 WooCommerce live test-store artifacts。
