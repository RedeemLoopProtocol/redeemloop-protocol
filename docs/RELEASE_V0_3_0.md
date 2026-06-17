# RedeemLoop v0.3.0 Release Notes

## English

RedeemLoop v0.3.0 is the Public Merchant Sandbox release.

This version adds:

- `Dockerfile` and `docker-compose.yml` for a one-command local sandbox.
- `.env.example` for API keys, persistence, embed origins, EVM confirmation policy, and webhook retry limits.
- `pnpm env:check` and `pnpm env:check:production` for environment validation.
- Production `start` scripts for `@redeemloop/api` and `@redeemloop/pos-verifier`.
- Bilingual public sandbox guide at `docs/PUBLIC_SANDBOX.md`.
- Bilingual API reference at `docs/API_REFERENCE.md`.
- README quick-start links for external merchant developers.

Known limits:

- The sandbox still uses file-backed persistence by default.
- Docker Compose is intended for local pilot integration, not production hosting.
- Production deployments still need a managed database, managed worker queue, TLS, secrets management, and merchant-specific operational monitoring.

## 中文

RedeemLoop v0.3.0 是 Public Merchant Sandbox 版本。

这一版新增：

- `Dockerfile` 和 `docker-compose.yml`，用于一条命令启动本地 sandbox。
- `.env.example`，覆盖 API key、持久化、嵌入来源、EVM 确认数策略和 webhook retry 限制。
- `pnpm env:check` 和 `pnpm env:check:production` 环境检查命令。
- `@redeemloop/api` 和 `@redeemloop/pos-verifier` 的 production `start` script。
- 双语 public sandbox guide：`docs/PUBLIC_SANDBOX.md`。
- 双语 API reference：`docs/API_REFERENCE.md`。
- README 新增面向外部商户开发者的快速开始链接。

已知限制：

- sandbox 默认仍使用文件型持久化。
- Docker Compose 面向本地 pilot 集成，不是生产托管方案。
- 生产部署仍需要托管数据库、托管 worker queue、TLS、secrets management 和商户级运维监控。
