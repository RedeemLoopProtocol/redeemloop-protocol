# RedeemLoop v0.10.0 Release Notes

RedeemLoop v0.10.0 starts the beta hardening track with managed Postgres persistence.

## Added

- Snapshot-backed Postgres persistence through `REDEEMLOOP_DATABASE_URL`.
- Migration file at `services/api/migrations/001_api_snapshots.sql`.
- Docker Compose Postgres service for the local sandbox without exposing a host database port.
- API config now reports the persistence kind: `none`, `json-file`, or `postgres`.
- Environment validation accepts either `REDEEMLOOP_DATABASE_URL` or `REDEEMLOOP_STORAGE_FILE`, and warns when production uses file-backed fallback storage.
- Unit coverage for the Postgres persistence adapter boundary.

## Notes

- This is the first managed database boundary for the beta path.
- The current implementation stores the existing API snapshot in Postgres JSONB to avoid rewriting the whole API data model in one release.
- Future beta hardening should split the snapshot into normalized merchant, vault, binding, PaymentIntent, proof, webhook, and audit-log tables.
- Production-certified claims still require live wallet certification, live commerce-store certification, managed worker queue, monitoring, HTTPS deployment, and operational runbooks.

## 中文

RedeemLoop v0.10.0 启动 beta 加固轨道，新增托管 Postgres 持久化。

## 新增

- 通过 `REDEEMLOOP_DATABASE_URL` 启用 Postgres snapshot 持久化。
- 新增 migration 文件：`services/api/migrations/001_api_snapshots.sql`。
- Docker Compose 本地 sandbox 新增 Postgres 服务，且不向宿主机暴露数据库端口。
- API config 现在会返回 persistence kind：`none`、`json-file` 或 `postgres`。
- 环境检查支持 `REDEEMLOOP_DATABASE_URL` 或 `REDEEMLOOP_STORAGE_FILE`，并在生产模式使用文件 fallback 时给出警告。
- 新增 Postgres persistence adapter 边界测试。

## 说明

- 这是 beta 路径上的第一个托管数据库边界。
- 当前实现把既有 API snapshot 存入 Postgres JSONB，避免在一个版本里重写整个 API 数据模型。
- 后续 beta 加固应把 snapshot 拆成规范化的 merchant、vault、binding、PaymentIntent、proof、webhook 和 audit-log 表。
- 生产级声明仍需要真实钱包认证、真实电商店铺认证、托管 worker queue、监控、HTTPS 部署和运维 runbook。
