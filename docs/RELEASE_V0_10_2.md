# RedeemLoop v0.10.2 - Operations Diagnostics Boundary

## English

RedeemLoop v0.10.2 adds webhook operations diagnostics for beta pilot readiness.

### Added

- `GET /v1/diagnostics/webhooks?merchantId=...`.
- Delivery counts for `pending`, `processing`, `delivered`, `failed`, and `dead_letter`.
- Stale `processing` detection using lease expiry and processing age.
- Worker drain heartbeat reporting through recent drain records.
- Operator `recommendedActions` for no recent worker drain, stale processing records, failed deliveries, and dead-letter deliveries.
- SDK helper `getWebhookDiagnostics`.
- Merchant Admin visibility for webhook diagnostics.

### Verification

- API, SDK, and POS console TypeScript checks pass.
- API tests pass with webhook worker lease and diagnostics coverage.
- SDK tests pass with diagnostics endpoint coverage.

### Remaining Beta Gaps

- Docker/Postgres/worker live compose smoke is still required on a Docker-enabled machine.
- Diagnostics still need external monitoring and alert routing before a public production pilot.
- Live wallet and WooCommerce/Shopify store certification remain required before production-certified claims.
- Webhook delivery and drain records still live inside the API snapshot; later production hardening should split them into normalized operational tables.

## 中文

RedeemLoop v0.10.2 新增 webhook 运维诊断，用于 beta pilot 准备。

### 新增

- `GET /v1/diagnostics/webhooks?merchantId=...`。
- `pending`、`processing`、`delivered`、`failed`、`dead_letter` 的 delivery 统计。
- 基于 lease 过期和 processing 时长的 stale `processing` 检测。
- 通过最近 drain record 报告 worker drain heartbeat。
- 面向 operator 的 `recommendedActions`，覆盖 worker 长时间无 drain、stale processing record、failed delivery 和 dead-letter delivery。
- SDK helper：`getWebhookDiagnostics`。
- Merchant Admin 新增 webhook diagnostics 可见性。

### 验证

- API、SDK 和 POS console TypeScript 检查通过。
- API 测试通过，覆盖 webhook worker lease 和 diagnostics。
- SDK 测试通过，覆盖 diagnostics endpoint。

### 剩余 Beta 缺口

- 仍需要在有 Docker 的机器上执行 Docker/Postgres/worker live compose smoke。
- Public production pilot 前，diagnostics 仍需要接入外部监控和告警路由。
- 真实钱包和 WooCommerce/Shopify 店铺认证仍是 production-certified 声明前置条件。
- Webhook delivery 和 drain record 仍保存在 API snapshot 中；后续生产加固应拆成规范化运维表。
