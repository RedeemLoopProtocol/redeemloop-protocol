# RedeemLoop v0.10.10 Release Notes

## English

v0.10.10 adds workspace beta version preparation.

### Added

- `pnpm beta:version:prepare` checks the package version changes required for a beta release tag.
- The command is dry-run by default and only writes package versions when `--write` is explicitly provided.
- `--release v0.10.x-beta.0` derives package version `0.10.x-beta.0`.

### Verification

- `node --check scripts/prepare-beta-version.mjs`
- `node scripts/prepare-beta-version.mjs --help`
- `corepack pnpm --silent beta:version:prepare -- --help`
- Temporary workspace dry-run confirmed no file writes.
- Temporary workspace `--write` confirmed root, package, app, and service package versions update consistently.
- `corepack pnpm verify`

### Remaining Beta Gap

This command prepares version alignment but does not decide the release tag. Run it with `--write` only after real beta evidence is complete and the beta release tag has been chosen.

## 中文

v0.10.10 新增 workspace beta version preparation。

### 新增

- `pnpm beta:version:prepare` 会检查 beta release tag 需要修改哪些 package version。
- 命令默认是 dry-run，只有显式传入 `--write` 才会写入 package version。
- `--release v0.10.x-beta.0` 会推导出 package version `0.10.x-beta.0`。

### 验证

- `node --check scripts/prepare-beta-version.mjs`
- `node scripts/prepare-beta-version.mjs --help`
- `corepack pnpm --silent beta:version:prepare -- --help`
- 临时 workspace dry-run 确认不会写文件。
- 临时 workspace `--write` 确认 root、package、app 和 service package version 会一致更新。
- `corepack pnpm verify`

### 剩余 Beta 缺口

该命令只负责准备版本一致性，不决定 release tag。只有在真实 beta evidence 完成且 beta release tag 已确定后，才应带 `--write` 运行。
