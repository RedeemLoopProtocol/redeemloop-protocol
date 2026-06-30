# RedeemLoop v0.10.23 Release Notes

## English

v0.10.23 hardens the GitHub Actions beta release preflight workflow after a real workflow run showed artifact downloads could collide with scaffold placeholders.

### Changed

- Evidence artifacts are now downloaded into a temporary directory before selected JSON files are copied into `evidence/`.
- Existing scaffold placeholders can be overwritten safely by downloaded artifacts.
- A missing or unavailable optional artifact download now emits a GitHub warning and still allows the preflight report to be generated.
- `pnpm beta:release:gate` now checks that the preflight workflow uses temporary artifact downloads before publication.

### Verification

- `node --check scripts/beta-release-gate.mjs`
- `pnpm --silent beta:release:gate -- --manifest docs/examples/beta-evidence.manifest.example.json --json`
- `corepack pnpm audit --audit-level moderate`
- `corepack pnpm verify`

### Remaining Beta Gap

The workflow now produces a report reliably, but it still does not create live evidence. Funded EVM wallet evidence, WooCommerce test-store evidence, and final public beta release notes remain required.

## 中文

v0.10.23 加固 GitHub Actions beta release preflight workflow。一次真实 workflow run 暴露了 artifact download 会和 scaffold placeholder 文件冲突的问题，本版本修复该问题。

### 变更

- Evidence artifacts 现在会先下载到临时目录，再把指定 JSON 文件复制到 `evidence/`。
- 已存在的 scaffold placeholder 可以被下载 artifact 安全覆盖。
- 可选 artifact 下载缺失或不可用时，现在会输出 GitHub warning，并继续生成 preflight report。
- `pnpm beta:release:gate` 现在会在发布前检查 preflight workflow 是否使用临时 artifact download。

### 验证

- `node --check scripts/beta-release-gate.mjs`
- `pnpm --silent beta:release:gate -- --manifest docs/examples/beta-evidence.manifest.example.json --json`
- `corepack pnpm audit --audit-level moderate`
- `corepack pnpm verify`

### 剩余 Beta 缺口

该 workflow 现在可以更可靠地生成报告，但仍不会创建 live evidence。仍需要 funded EVM wallet evidence、WooCommerce test-store evidence 和最终公开 beta release notes。
