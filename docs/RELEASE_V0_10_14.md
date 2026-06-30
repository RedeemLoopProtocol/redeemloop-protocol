# RedeemLoop v0.10.14 Release Notes

## English

v0.10.14 adds a frozen lockfile check to the beta release gate.

### Changed

- `pnpm beta:release:gate` now runs `corepack pnpm install --lockfile-only --frozen-lockfile`.
- Package manifest, workspace setting, and lockfile drift is now caught before beta publication.
- The release gate help text and beta readiness guide now mention pnpm settings and frozen-lockfile checks.

### Verification

- `node --check scripts/beta-release-gate.mjs`
- `corepack pnpm install --lockfile-only --frozen-lockfile`
- Temporary release gate confirmed `pnpm.lockfile.frozen` passes with a synced lockfile.
- Temporary stale lockfile fixture failed with `pnpm.lockfile.frozen`.
- `corepack pnpm audit --audit-level moderate`
- `corepack pnpm verify`

### Remaining Beta Gap

The release gate now covers lockfile consistency, but beta publication still needs real external Docker Compose, production readiness, funded EVM wallet, and WooCommerce test-store certification artifacts.

## 中文

v0.10.14 在 beta release gate 中新增 frozen lockfile 检查。

### 变更

- `pnpm beta:release:gate` 现在会运行 `corepack pnpm install --lockfile-only --frozen-lockfile`。
- Package manifest、workspace setting 和 lockfile 漂移会在 beta 发布前被发现。
- Release gate help text 和 beta readiness guide 现在会说明 pnpm settings 与 frozen-lockfile 检查。

### 验证

- `node --check scripts/beta-release-gate.mjs`
- `corepack pnpm install --lockfile-only --frozen-lockfile`
- 临时 release gate 确认 lockfile 同步时 `pnpm.lockfile.frozen` 通过。
- 临时 stale lockfile fixture 会以 `pnpm.lockfile.frozen` 失败。
- `corepack pnpm audit --audit-level moderate`
- `corepack pnpm verify`

### 剩余 Beta 缺口

Release gate 现在已覆盖 lockfile consistency，但 beta 发布仍需要真实外部 Docker Compose、production readiness、funded EVM wallet 和 WooCommerce test-store certification artifacts。
