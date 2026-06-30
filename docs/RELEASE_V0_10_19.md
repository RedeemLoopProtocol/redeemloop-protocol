# RedeemLoop v0.10.19 Release Notes

## English

v0.10.19 adds manual GitHub Actions workflows for the two remaining live certification artifacts: funded EVM wallet evidence and WooCommerce mark-as-paid evidence.

### Added

- `.github/workflows/beta-evm-certification.yml` runs `pnpm beta:evidence:evm` from manually supplied transaction fields and the `REDEEMLOOP_EVM_RPC_URLS` repository secret.
- `.github/workflows/beta-commerce-certification.yml` runs WooCommerce live mark-as-paid certification through `pnpm beta:evidence:commerce` and the `REDEEMLOOP_COMMERCE_CERTIFICATION_API_KEY` repository secret.
- Both workflows validate the generated JSON and upload private evidence artifacts for download into the ignored local `evidence/` directory.

### Changed

- `pnpm beta:release:gate` now checks that the EVM wallet and WooCommerce certification workflows are present before publication.
- Beta readiness docs now include GitHub Actions paths for the funded wallet and WooCommerce evidence artifacts.

### Verification

- `node --check scripts/beta-release-gate.mjs`
- `pnpm --silent beta:release:gate -- --help`
- Static workflow inspection for EVM and WooCommerce certification workflows.
- Example-manifest release gate run confirmed `github.beta_evm_certification` and `github.beta_woocommerce_certification` pass while missing live artifacts still fail.
- `corepack pnpm verify`

### Remaining Beta Gap

The workflows do not create a funded transaction or a WooCommerce order by themselves. They must be run after a real EVM voucher payment and a real WooCommerce test-store mark-as-paid flow.

## 中文

v0.10.19 新增两个剩余 live certification artifact 的手动 GitHub Actions workflow：funded EVM wallet evidence 和 WooCommerce mark-as-paid evidence。

### 新增

- `.github/workflows/beta-evm-certification.yml` 会根据手动输入的交易字段和 `REDEEMLOOP_EVM_RPC_URLS` 仓库 secret，运行 `pnpm beta:evidence:evm`。
- `.github/workflows/beta-commerce-certification.yml` 会通过 `pnpm beta:evidence:commerce` 和 `REDEEMLOOP_COMMERCE_CERTIFICATION_API_KEY` 仓库 secret，执行 WooCommerce live mark-as-paid certification。
- 两个 workflow 都会校验生成的 JSON，并上传私有 evidence artifact，供下载到本地被 Git 忽略的 `evidence/` 目录。

### 变更

- `pnpm beta:release:gate` 现在会在发布前检查 EVM wallet 和 WooCommerce certification workflow 是否存在。
- Beta readiness 文档新增 funded wallet 和 WooCommerce evidence artifact 的 GitHub Actions 路径。

### 验证

- `node --check scripts/beta-release-gate.mjs`
- `pnpm --silent beta:release:gate -- --help`
- 对 EVM 和 WooCommerce certification workflow 做静态检查。
- 使用 example manifest 运行 release gate，确认 `github.beta_evm_certification` 和 `github.beta_woocommerce_certification` 通过，同时缺失的真实 artifact 仍然失败。
- `corepack pnpm verify`

### 剩余 Beta 缺口

这些 workflow 本身不会创建 funded transaction 或 WooCommerce order。必须在真实 EVM voucher payment 和真实 WooCommerce test-store mark-as-paid flow 完成后运行。
