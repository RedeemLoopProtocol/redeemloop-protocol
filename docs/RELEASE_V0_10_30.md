# RedeemLoop v0.10.30 Release Notes

## English

v0.10.30 adds a GitHub Actions workflow for reproducing the final beta release gate.

### Changed

- Added `.github/workflows/beta-release-gate.yml`.
- The workflow accepts the beta release tag plus the required compose-smoke, production-readiness, funded EVM, and WooCommerce certification workflow run IDs.
- It downloads those evidence artifacts through `pnpm beta:evidence:download`.
- It generates the public-safe bilingual release notes artifact with `pnpm beta:evidence:summary`.
- It runs `pnpm beta:release:gate` and uploads `beta-release-gate.json`, `RELEASE_BETA.md`, and the evidence manifest as `redeemloop-beta-release-gate`.
- The final local release gate now checks that this GitHub Actions final-gate workflow exists and preserves the expected evidence, release-note, version-match, JSON, and artifact-upload steps.

### Verification

- `node --check scripts/beta-release-gate.mjs`
- `corepack pnpm --silent beta:release:gate -- --manifest docs/examples/beta-evidence.manifest.example.json --json`
- Workflow text checks for `pnpm --silent beta:evidence:download`, `pnpm --silent beta:evidence:summary`, `pnpm --silent beta:release:gate`, `--require-version-match`, `evidence/beta-release-gate.json`, and `redeemloop-beta-release-gate`.
- `git diff --check` on the changed files.

### Remaining Beta Gap

This release makes the final gate reproducible in GitHub Actions, but it does not create live funded-wallet or WooCommerce evidence. The first public beta still requires the commerce certification API key, funded EVM wallet certification evidence, live WooCommerce mark-as-paid evidence, generated public-safe bilingual beta release notes, and a passing final gate.

## 中文

v0.10.30 新增用于复现最终 beta release gate 的 GitHub Actions workflow。

### 变更

- 新增 `.github/workflows/beta-release-gate.yml`。
- 该 workflow 接收 beta release tag，以及必需的 compose-smoke、production-readiness、funded EVM 和 WooCommerce certification workflow run IDs。
- 它会通过 `pnpm beta:evidence:download` 下载这些 evidence artifacts。
- 它会通过 `pnpm beta:evidence:summary` 生成公开安全的双语 release notes artifact。
- 它会运行 `pnpm beta:release:gate`，并把 `beta-release-gate.json`、`RELEASE_BETA.md` 和 evidence manifest 作为 `redeemloop-beta-release-gate` 上传。
- 本地最终 release gate 现在也会检查该 GitHub Actions final-gate workflow 是否存在，并保持预期的 evidence、release-note、version-match、JSON 和 artifact-upload 步骤。

### 验证

- `node --check scripts/beta-release-gate.mjs`
- `corepack pnpm --silent beta:release:gate -- --manifest docs/examples/beta-evidence.manifest.example.json --json`
- 检查 workflow 文本包含 `pnpm --silent beta:evidence:download`、`pnpm --silent beta:evidence:summary`、`pnpm --silent beta:release:gate`、`--require-version-match`、`evidence/beta-release-gate.json` 和 `redeemloop-beta-release-gate`。
- 对变更文件运行 `git diff --check`。

### 剩余 Beta 缺口

本版本让最终 gate 可以在 GitHub Actions 中复现，但不会生成 live funded-wallet 或 WooCommerce evidence。首个公开 beta 仍需要 commerce certification API key、funded EVM wallet certification evidence、真实 WooCommerce mark-as-paid evidence、生成后的公开安全双语 beta release notes，以及通过最终 gate。
