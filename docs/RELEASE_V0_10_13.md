# RedeemLoop v0.10.13 Release Notes

## English

v0.10.13 fixes pnpm workspace override hygiene before beta publication.

### Changed

- Moved `postcss` and `ws` overrides from the deprecated root `package.json` `pnpm` field to `pnpm-workspace.yaml`.
- `pnpm beta:release:gate` now checks that root `package.json` no longer uses deprecated pnpm settings.
- `pnpm beta:release:gate` now checks that the required workspace overrides are still active.

### Verification

- `node --check scripts/beta-release-gate.mjs`
- `corepack pnpm install --lockfile-only`
- `corepack pnpm --silent beta:release:gate -- --help`
- Temporary release gate confirmed pnpm settings checks pass.
- Temporary deprecated `package.json` pnpm settings fail the release gate.
- `corepack pnpm audit --audit-level moderate`
- `corepack pnpm verify`

### Remaining Beta Gap

Dependency override hygiene is now guarded, but beta publication still needs real external Docker Compose, production readiness, funded EVM wallet, and WooCommerce test-store certification artifacts.

## 中文

v0.10.13 修复 beta 发布前的 pnpm workspace override 配置位置问题。

### 变更

- 将 `postcss` 和 `ws` overrides 从 root `package.json` 中已废弃的 `pnpm` 字段迁移到 `pnpm-workspace.yaml`。
- `pnpm beta:release:gate` 现在会检查 root `package.json` 不再使用已废弃的 pnpm settings。
- `pnpm beta:release:gate` 现在会检查必需的 workspace overrides 仍处于有效配置位置。

### 验证

- `node --check scripts/beta-release-gate.mjs`
- `corepack pnpm install --lockfile-only`
- `corepack pnpm --silent beta:release:gate -- --help`
- 临时 release gate 确认 pnpm settings 检查通过。
- 临时废弃 `package.json` pnpm settings 会导致 release gate 失败。
- `corepack pnpm audit --audit-level moderate`
- `corepack pnpm verify`

### 剩余 Beta 缺口

依赖 override 配置已被 gate 保护，但 beta 发布仍需要真实外部 Docker Compose、production readiness、funded EVM wallet 和 WooCommerce test-store certification artifacts。
