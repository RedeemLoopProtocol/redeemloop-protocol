# RedeemLoop v0.2.2 Release Notes

## English

RedeemLoop v0.2.2 is the Persistence & Merchant Accounts sandbox release.

This version adds:

- File-backed sandbox persistence with `REDEEMLOOP_STORAGE_FILE`.
- Recovery of merchants, vaults, entitlements, bindings, PaymentIntents, settlement proofs, proof idempotency, mark-as-paid idempotency, webhook endpoints, commerce payment records, and terminal/redemption compatibility state after API restart.
- Merchant-scoped API key enforcement with `REDEEMLOOP_API_KEYS`.
- API config metadata showing persistence/auth status.
- Tests covering restart recovery and API key rejection paths.

Known limits:

- The persistence adapter is a sandbox file store, not a production database migration layer.
- Settlement proof is still client-submitted and should be treated as sandbox/demo trust only.
- Webhook endpoint testing exists, but reliable delivery queues are scheduled for a later release.

## 中文

RedeemLoop v0.2.2 是 Persistence & Merchant Accounts sandbox 版本。

这一版新增：

- 通过 `REDEEMLOOP_STORAGE_FILE` 启用文件型 sandbox 持久化。
- API 重启后可恢复 merchant、vault、entitlement、binding、PaymentIntent、settlement proof、proof 幂等、mark-as-paid 幂等、webhook endpoint、commerce payment record，以及 terminal/redemption 兼容状态。
- 通过 `REDEEMLOOP_API_KEYS` 启用商户级 API key 校验。
- API config 响应展示 persistence/auth 状态。
- 测试覆盖重启恢复和 API key 拒绝路径。

已知限制：

- 当前 persistence adapter 是 sandbox 文件存储，不是生产数据库迁移层。
- settlement proof 仍由客户端提交，只适合作为 sandbox/demo 信任模型。
- webhook endpoint test 已存在，可靠投递队列将在后续版本实现。
