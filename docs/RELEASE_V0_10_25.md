# RedeemLoop v0.10.25 Release Notes

## English

v0.10.25 adds a non-destructive beta evidence scaffold recovery mode for release operators.

### Changed

- `pnpm beta:evidence:init -- --missing-only` now creates only missing evidence scaffold files.
- Existing local evidence artifacts are skipped instead of overwritten in `--missing-only` mode.
- The scaffold summary now reports created and skipped files.
- Beta readiness docs now explain when to use `--missing-only` versus `--force`.

### Verification

- `node --check scripts/init-beta-evidence.mjs`
- `node scripts/init-beta-evidence.mjs --help`
- Empty-directory scaffold test with `--missing-only`.
- Existing-artifact preservation test with `--missing-only`.
- Existing-artifact rejection test without `--missing-only` or `--force`.
- Local preflight after restoring the missing evidence manifest.

### Remaining Beta Gap

This release reduces operator risk when restoring a local evidence folder, but it does not create live evidence. The first public beta still requires the commerce certification API key, funded EVM wallet certification evidence, live WooCommerce mark-as-paid evidence, and generated public-safe bilingual beta release notes.

## 中文

v0.10.25 为发布操作员新增非破坏性的 beta evidence scaffold 恢复模式。

### 变更

- `pnpm beta:evidence:init -- --missing-only` 现在只创建缺失的 evidence scaffold 文件。
- 在 `--missing-only` 模式下，已有本地 evidence artifact 会被跳过，不会被覆盖。
- Scaffold 输出 summary 现在会显示 created 和 skipped 文件数量。
- Beta readiness 文档补充什么时候使用 `--missing-only`，什么时候才使用 `--force`。

### 验证

- `node --check scripts/init-beta-evidence.mjs`
- `node scripts/init-beta-evidence.mjs --help`
- 使用 `--missing-only` 验证空目录 scaffold 生成。
- 使用 `--missing-only` 验证已有 artifact 不被覆盖。
- 验证不带 `--missing-only` 或 `--force` 时已有 artifact 会被拒绝覆盖。
- 恢复缺失 evidence manifest 后运行本地 preflight。

### 剩余 Beta 缺口

本版本降低本地 evidence 目录恢复时的操作风险，但不会生成 live evidence。首个公开 beta 仍需要 commerce certification API key、funded EVM wallet certification evidence、真实 WooCommerce mark-as-paid evidence，以及生成后的公开安全双语 beta release notes。
