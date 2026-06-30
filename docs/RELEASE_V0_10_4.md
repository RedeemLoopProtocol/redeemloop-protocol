# RedeemLoop v0.10.4 - Docker Compose Smoke Command

## English

RedeemLoop v0.10.4 adds a reproducible Docker Compose smoke command for beta evidence collection on Docker-enabled machines.

### Added

- `pnpm beta:smoke:compose`.
- `scripts/compose-smoke.mjs`.
- API health check against `http://127.0.0.1:3002`.
- Console readiness check against `http://127.0.0.1:3000`.
- Runtime assertion that the API reports `persistence.kind: "postgres"`.
- Webhook worker heartbeat assertion through `GET /v1/diagnostics/webhooks`.
- Default cleanup with `docker compose down`, with `--keep-up` and `--json` options.

### Verification

- `node scripts/compose-smoke.mjs --help` passes.
- `node --check scripts/compose-smoke.mjs` passes.
- Local execution still needs a Docker-enabled machine; this workstation has no Docker CLI.

### Remaining Beta Gaps

- Run `pnpm beta:smoke:compose --json` on a Docker-enabled machine and archive the output.
- Run funded EVM wallet certification with trusted receipt recheck.
- Run WooCommerce and Shopify test-store mark-as-paid certification.
- Connect readiness and webhook diagnostics to external monitoring or alert routing.

## 中文

RedeemLoop v0.10.4 新增可复现的 Docker Compose smoke 命令，用于在有 Docker 的机器上采集 beta evidence。

### 新增

- `pnpm beta:smoke:compose`。
- `scripts/compose-smoke.mjs`。
- 检查 `http://127.0.0.1:3002` 的 API health。
- 检查 `http://127.0.0.1:3000` 的 console readiness。
- 断言 API 返回 `persistence.kind: "postgres"`。
- 通过 `GET /v1/diagnostics/webhooks` 断言 webhook worker heartbeat。
- 默认执行 `docker compose down` 清理；支持 `--keep-up` 和 `--json`。

### 验证

- `node scripts/compose-smoke.mjs --help` 通过。
- `node --check scripts/compose-smoke.mjs` 通过。
- 本机仍需要 Docker-enabled 环境才能执行 live smoke；当前工作站没有 Docker CLI。

### 剩余 Beta 缺口

- 在有 Docker 的机器上运行 `pnpm beta:smoke:compose --json` 并归档输出。
- 执行 funded EVM wallet certification 和 trusted receipt recheck。
- 执行 WooCommerce 和 Shopify test-store mark-as-paid certification。
- 将 readiness 和 webhook diagnostics 接入外部监控或告警路由。
