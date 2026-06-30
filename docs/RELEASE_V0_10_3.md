# RedeemLoop v0.10.3 - Beta Readiness Evidence

## English

RedeemLoop v0.10.3 adds a beta readiness command for collecting deployment evidence before a public beta or pilot.

### Added

- `pnpm beta:check`.
- `pnpm beta:check:production`.
- `scripts/beta-readiness.mjs`.
- Bilingual guide at `docs/BETA_READINESS.md`.
- Checks for API health, runtime config, persistence kind, merchant API key mode, webhook diagnostics, EVM RPC diagnostics, Shopify diagnostics, and optional Docker Compose config.
- `--json` output for release evidence archives.

### Verification

- `node scripts/beta-readiness.mjs --help` passes.
- Local HTTP smoke against API plus one-shot webhook worker passes with expected sandbox warnings.

### Remaining Beta Gaps

- This command does not replace live certification.
- Docker/Postgres/worker live compose smoke still needs a Docker-enabled machine.
- Funded EVM wallet transfer and trusted receipt recheck remain required for production-certified EVM claims.
- WooCommerce and Shopify test-store mark-as-paid certification remain required before production-certified commerce claims.

## 中文

RedeemLoop v0.10.3 新增 beta readiness 命令，用于在 public beta 或 pilot 前采集部署证据。

### 新增

- `pnpm beta:check`。
- `pnpm beta:check:production`。
- `scripts/beta-readiness.mjs`。
- 双语指南：`docs/BETA_READINESS.md`。
- 检查 API health、runtime config、persistence kind、商户 API key 模式、webhook diagnostics、EVM RPC diagnostics、Shopify diagnostics 和可选 Docker Compose config。
- 支持 `--json` 输出，便于归档 release evidence。

### 验证

- `node scripts/beta-readiness.mjs --help` 通过。
- 本地 API 加 one-shot webhook worker 的 HTTP smoke 通过，并输出预期 sandbox warnings。

### 剩余 Beta 缺口

- 该命令不能替代 live certification。
- Docker/Postgres/worker live compose smoke 仍需要在有 Docker 的机器上执行。
- Production-certified EVM 声明前，仍需要 funded EVM wallet transfer 和 trusted receipt recheck。
- Production-certified commerce 声明前，仍需要 WooCommerce 和 Shopify test-store mark-as-paid certification。
