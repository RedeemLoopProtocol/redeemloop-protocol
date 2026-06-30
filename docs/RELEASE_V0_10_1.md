# RedeemLoop v0.10.1 - Webhook Worker Boundary

## English

RedeemLoop v0.10.1 adds a standalone webhook worker boundary for beta hardening.

### Added

- `@redeemloop/api` worker entrypoint: `pnpm --filter @redeemloop/api worker`.
- Development worker command: `pnpm --filter @redeemloop/api worker:dev`.
- Docker Compose `worker` service that drains due webhook deliveries through the API.
- Webhook delivery `processing` status plus `leaseOwner`, `leaseAcquiredAt`, and `leaseExpiresAt`.
- `workerId` and `leaseMs` support on `POST /v1/webhook-deliveries/drain-pending`.
- Outbound webhook request timeout configuration through `WEBHOOK_REQUEST_TIMEOUT_MS`.
- Worker configuration through `REDEEMLOOP_API_BASE_URL`, `REDEEMLOOP_WORKER_MERCHANT_ID`, `REDEEMLOOP_WORKER_API_KEY`, `REDEEMLOOP_WORKER_INTERVAL_MS`, `REDEEMLOOP_WORKER_BATCH_SIZE`, and `REDEEMLOOP_WORKER_REQUEST_TIMEOUT_MS`.

### Verification

- API TypeScript check passes.
- API tests pass with 33 tests, including a concurrent worker drain lease test.

### Remaining Beta Gaps

- Docker/Postgres live smoke is still required before tagging because the current machine has no Docker CLI.
- Production monitoring and alerting are still required for failed, dead-letter, and stale `processing` deliveries.
- Live wallet and WooCommerce/Shopify store certification remain required before production-certified claims.
- Webhook delivery records still live in the API snapshot; later production hardening should split them into normalized operational tables.

## 中文

RedeemLoop v0.10.1 新增独立 webhook worker 边界，用于 beta 加固。

### 新增

- `@redeemloop/api` worker 入口：`pnpm --filter @redeemloop/api worker`。
- 开发 worker 命令：`pnpm --filter @redeemloop/api worker:dev`。
- Docker Compose `worker` 服务，通过 API drain 到期 webhook delivery。
- Webhook delivery 新增 `processing` 状态，以及 `leaseOwner`、`leaseAcquiredAt`、`leaseExpiresAt`。
- `POST /v1/webhook-deliveries/drain-pending` 支持 `workerId` 和 `leaseMs`。
- 通过 `WEBHOOK_REQUEST_TIMEOUT_MS` 配置出站 webhook 请求超时。
- Worker 配置变量：`REDEEMLOOP_API_BASE_URL`、`REDEEMLOOP_WORKER_MERCHANT_ID`、`REDEEMLOOP_WORKER_API_KEY`、`REDEEMLOOP_WORKER_INTERVAL_MS`、`REDEEMLOOP_WORKER_BATCH_SIZE`、`REDEEMLOOP_WORKER_REQUEST_TIMEOUT_MS`。

### 验证

- API TypeScript 检查通过。
- API 测试通过，共 33 个测试，包含并发 worker drain lease 测试。

### 剩余 Beta 缺口

- 打 tag 前仍需要 Docker/Postgres live smoke；当前机器没有 Docker CLI，无法本地执行。
- 生产部署仍需要监控和告警 failed、dead-letter、长时间 `processing` 的 delivery。
- 真实钱包和 WooCommerce/Shopify 店铺认证仍是 production-certified 声明前置条件。
- Webhook delivery record 仍保存在 API snapshot 中；后续生产加固应拆成规范化运维表。
