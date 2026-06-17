# RedeemLoop v0.2.5 Release Notes

## English

RedeemLoop v0.2.5 is the Webhook Delivery & Operations release.

This version adds:

- Persistent webhook event outbox for `payment_intent.paid`.
- Persistent webhook delivery records for matching active merchant endpoints.
- Signed outbound delivery attempts using timestamp, nonce, delivery ID, event ID, and HMAC signature headers.
- Delivery status APIs for event listing, delivery listing, manual attempt, and replay.
- Retry/backoff state with `pending`, `delivered`, `failed`, and `dead_letter` statuses.
- SDK helpers for webhook event and delivery operations.
- API tests for enqueue, signature verification, delivery success, and replay.

Known limits:

- The outbox is still the sandbox API persistence layer, not a production queue.
- Production deployments should move webhook events and deliveries to a managed database and worker.
- Delivery attempts are explicit API operations in this release; always-on background dispatch is deferred.

## 中文

RedeemLoop v0.2.5 是 Webhook Delivery & Operations 版本。

这一版新增：

- `payment_intent.paid` 的持久化 webhook event outbox。
- 针对匹配 active 商户 endpoint 的持久化 webhook delivery record。
- 出站投递使用 timestamp、nonce、delivery ID、event ID 和 HMAC signature headers 签名。
- Delivery status API：event 列表、delivery 列表、手动 attempt 和 replay。
- Retry/backoff 状态，包含 `pending`、`delivered`、`failed`、`dead_letter`。
- SDK 新增 webhook event 和 delivery operations helper。
- API 测试覆盖入队、签名校验、成功投递和 replay。

已知限制：

- 当前 outbox 仍基于 sandbox API persistence layer，不是生产级队列。
- 生产部署应把 webhook event 和 delivery 迁移到托管数据库和 worker。
- 本版本的投递通过显式 API operation 触发；常驻后台自动投递延后实现。
