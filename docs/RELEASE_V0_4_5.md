# RedeemLoop v0.4.5

## English

RedeemLoop v0.4.5 hardens the Phase 0 pilot surface before merchant-admin and commerce-plugin work.

### Added

- `POST /v1/merchant-vaults/:vaultId/verification-challenge`.
- Real EVM vault ownership verification through signed challenge messages.
- `POST /v1/payment-intents/expire-stale`.
- `GET /v1/audit-logs`.
- `POST /v1/webhook-deliveries/drain-pending`.
- SDK helpers for vault challenge, stale expiration, webhook drain, and audit logs.
- Persistent sandbox snapshot support for audit logs.

### Changed

- PaymentIntent expiration is enforced on API requests in merchant scope.
- PaymentIntent state changes, settlement advancement, vault verification, and expiration cleanup now write audit records.
- Webhook delivery can now be operated by a simple worker or cron loop.

### Verification

- `pnpm --filter @redeemloop/api lint && pnpm --filter @redeemloop/api test`
- `pnpm --filter @redeemloop/sdk lint && pnpm --filter @redeemloop/sdk test`

### Known Limits

- Audit logs are still sandbox/pilot records, not a regulated immutable ledger.
- Webhook drain is an operator endpoint, not yet a bundled always-on background service.
- Non-EVM vault signature verification remains adapter-specific future work.

## 中文

RedeemLoop v0.4.5 在 merchant admin 和 commerce plugin 深化之前，先强化 Phase 0 pilot 表面。

### 新增

- `POST /v1/merchant-vaults/:vaultId/verification-challenge`。
- 通过签名 challenge 执行真实 EVM vault ownership verification。
- `POST /v1/payment-intents/expire-stale`。
- `GET /v1/audit-logs`。
- `POST /v1/webhook-deliveries/drain-pending`。
- SDK 新增 vault challenge、stale expiration、webhook drain 和 audit logs helpers。
- 持久化 sandbox snapshot 支持 audit logs。

### 变更

- API 请求会在商户范围内执行 PaymentIntent expiration。
- PaymentIntent 状态变化、settlement advancement、vault verification 和 expiration cleanup 会写入 audit records。
- Webhook delivery 现在可以通过简单 worker 或 cron loop 运维。

### 验证

- `pnpm --filter @redeemloop/api lint && pnpm --filter @redeemloop/api test`
- `pnpm --filter @redeemloop/sdk lint && pnpm --filter @redeemloop/sdk test`

### 已知限制

- Audit logs 仍是 sandbox/pilot 记录，不是受监管不可变账本。
- Webhook drain 是 operator endpoint，还不是内置常驻后台服务。
- 非 EVM vault 签名验证仍属于后续 adapter-specific 工作。
