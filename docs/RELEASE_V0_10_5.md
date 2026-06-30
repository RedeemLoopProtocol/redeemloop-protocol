# RedeemLoop v0.10.5 - Beta Evidence Manifest

## English

RedeemLoop v0.10.5 adds a release evidence manifest validator for public beta preparation.

### Added

- `pnpm beta:evidence:check`.
- `scripts/check-beta-evidence.mjs`.
- Example manifest at `docs/examples/beta-evidence.manifest.example.json`.
- Structural validation for Docker Compose smoke JSON, production readiness JSON, funded EVM wallet certification JSON, WooCommerce certification JSON, optional Shopify certification JSON, and beta release notes.

### Verification

- `node --check scripts/check-beta-evidence.mjs` passes.
- `node scripts/check-beta-evidence.mjs --help` passes.

### Remaining Beta Gaps

- Produce real external artifacts and validate them with `pnpm beta:evidence:check -- --manifest evidence/beta-evidence.manifest.json`.
- Run Docker Compose smoke on a Docker-enabled machine.
- Run funded EVM wallet certification and trusted receipt recheck.
- Run WooCommerce and optional Shopify test-store mark-as-paid certification.

## 中文

RedeemLoop v0.10.5 新增 release evidence manifest validator，用于 public beta 准备。

### 新增

- `pnpm beta:evidence:check`。
- `scripts/check-beta-evidence.mjs`。
- 示例 manifest：`docs/examples/beta-evidence.manifest.example.json`。
- 结构化校验 Docker Compose smoke JSON、production readiness JSON、funded EVM wallet certification JSON、WooCommerce certification JSON、可选 Shopify certification JSON 和 beta release notes。

### 验证

- `node --check scripts/check-beta-evidence.mjs` 通过。
- `node scripts/check-beta-evidence.mjs --help` 通过。

### 剩余 Beta 缺口

- 生成真实外部 artifacts，并通过 `pnpm beta:evidence:check -- --manifest evidence/beta-evidence.manifest.json` 校验。
- 在有 Docker 的机器上运行 Docker Compose smoke。
- 执行 funded EVM wallet certification 和 trusted receipt recheck。
- 执行 WooCommerce 和可选 Shopify test-store mark-as-paid certification。
