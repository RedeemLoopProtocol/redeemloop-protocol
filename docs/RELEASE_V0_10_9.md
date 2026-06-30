# RedeemLoop v0.10.9 Release Notes

## English

v0.10.9 adds a final beta release gate.

### Added

- `pnpm beta:release:gate` combines evidence validation, bilingual release-note checks, README beta-readiness link checks, CI/Pages workflow presence checks, and workspace version consistency checks.
- `--require-version-match` fails the gate unless every workspace package version matches the release tag without the leading `v`.
- CI now smoke-checks the beta release gate script.
- `pnpm beta:version:prepare` prepares consistent workspace package versions before running the strict gate.

### Verification

- `node --check scripts/beta-release-gate.mjs`
- `node scripts/beta-release-gate.mjs --help`
- `corepack pnpm --silent beta:release:gate -- --help`
- Temporary complete manifest gate: 10 pass, 1 version warning, 0 fail.
- Strict version-match gate against the same temporary manifest: expected failure on `versions.release_match`.
- Temporary workspace version dry-run and write tests.
- `corepack pnpm verify`

### Remaining Beta Gap

The final gate does not create external evidence. It should be run after Docker Compose smoke, production readiness, funded EVM wallet, and commerce certification artifacts are real, and after workspace package versions are bumped to the beta tag.

## 中文

v0.10.9 新增最终 beta release gate。

### 新增

- `pnpm beta:release:gate` 会组合检查 evidence validation、双语 release-note、README beta-readiness 链接、CI/Pages workflow 和 workspace version 一致性。
- `--require-version-match` 会要求所有 workspace package version 与去掉开头 `v` 的 release tag 完全一致，否则 gate 失败。
- CI 现在会 smoke-check beta release gate 脚本。
- `pnpm beta:version:prepare` 会在运行 strict gate 前准备一致的 workspace package version。

### 验证

- `node --check scripts/beta-release-gate.mjs`
- `node scripts/beta-release-gate.mjs --help`
- `corepack pnpm --silent beta:release:gate -- --help`
- 临时完整 manifest gate：10 pass、1 个 version warning、0 fail。
- 同一个临时 manifest 的 strict version-match gate：按预期在 `versions.release_match` 失败。
- 临时 workspace version dry-run 和 write 测试。
- `corepack pnpm verify`

### 剩余 Beta 缺口

最终 gate 不会生成外部证据。它应在 Docker Compose smoke、production readiness、funded EVM wallet、commerce certification artifact 都是真实结果，并且 workspace package version 已 bump 到 beta tag 之后运行。
