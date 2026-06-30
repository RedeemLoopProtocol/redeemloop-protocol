# RedeemLoop v0.10.16 Release Notes

## English

v0.10.16 adds a GitHub Actions path for Docker Compose smoke evidence and makes compose-smoke JSON output safe for artifact capture.

### Changed

- `pnpm beta:smoke:compose -- --json` now writes only the JSON report to stdout.
- Docker Compose `up` and `down` logs are captured in JSON mode so redirected evidence files are not polluted by build or shutdown output.

### Added

- `.github/workflows/beta-compose-smoke.yml` runs the Docker Compose smoke on an Ubuntu GitHub runner.
- The workflow validates `evidence/compose-smoke.json` as JSON and uploads it as the `redeemloop-compose-smoke-evidence` artifact.
- Beta readiness and public sandbox docs explain how to use the workflow when local Docker is unavailable.

### Verification

- `node --check scripts/compose-smoke.mjs`
- `node scripts/compose-smoke.mjs --help`
- Mocked Docker fixture confirmed `--json` stdout is parseable JSON without compose log pollution.
- Workflow YAML was inspected for checkout, pnpm, Node, Foundry, build, smoke, JSON validation, and artifact upload steps.
- `corepack pnpm verify`

### Remaining Beta Gap

The workflow creates a repeatable route to the Docker Compose smoke artifact, but the workflow still needs to be run and the artifact downloaded into `evidence/compose-smoke.json` before final beta evidence validation.

## 中文

v0.10.16 新增通过 GitHub Actions 生成 Docker Compose smoke evidence 的路径，并让 compose-smoke JSON 输出可以安全归档。

### 变更

- `pnpm beta:smoke:compose -- --json` 现在只会向 stdout 写入 JSON report。
- JSON 模式下 Docker Compose `up` 和 `down` 日志会被捕获，不会污染重定向生成的 evidence 文件。

### 新增

- `.github/workflows/beta-compose-smoke.yml` 会在 Ubuntu GitHub runner 上运行 Docker Compose smoke。
- Workflow 会校验 `evidence/compose-smoke.json` 是 JSON，并上传为 `redeemloop-compose-smoke-evidence` artifact。
- Beta readiness 和 public sandbox 文档说明了本机没有 Docker 时如何使用该 workflow。

### 验证

- `node --check scripts/compose-smoke.mjs`
- `node scripts/compose-smoke.mjs --help`
- Mocked Docker fixture 确认 `--json` stdout 是可解析 JSON，且没有 compose log 污染。
- 已检查 workflow YAML 包含 checkout、pnpm、Node、Foundry、build、smoke、JSON 校验和 artifact upload 步骤。
- `corepack pnpm verify`

### 剩余 Beta 缺口

该 workflow 提供了可复现的 Docker Compose smoke artifact 生成路径，但仍需要实际运行 workflow，并把 artifact 下载到 `evidence/compose-smoke.json` 后，才能进行最终 beta evidence validation。
