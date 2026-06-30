# RedeemLoop v0.10.8 Release Notes

## English

v0.10.8 adds commerce mark-as-paid certification evidence generation and blocks dry-run commerce artifacts from beta validation.

### Added

- `pnpm beta:evidence:commerce` calls RedeemLoop `/v1/commerce/confirm` and writes WooCommerce or Shopify certification evidence.
- The command records provider, store URL, order ID, PaymentIntent ID, payment ID, mark-paid status, dry-run status, timestamp, and request URL.
- The beta evidence scaffold now points WooCommerce operators at the commerce evidence command.

### Changed

- Commerce evidence validation now requires `dryRun: false`.
- Commerce evidence validation now accepts only `paid` or `payment_complete` mark-paid status for beta evidence.

### Verification

- `node --check scripts/create-commerce-certification-evidence.mjs`
- `node scripts/create-commerce-certification-evidence.mjs --help`
- `corepack pnpm --silent beta:evidence:commerce -- --help`
- Local mock API commerce evidence generation and manifest validation: 5 pass, 1 optional Shopify warning, 0 fail.
- Dry-run commerce artifact rejection: 1 expected fail.
- `corepack pnpm verify`

### Remaining Beta Gap

The command can call a live commerce adapter and change test-store order state. Real beta evidence still requires running it against intentional WooCommerce and optional Shopify certification orders after settlement is confirmed.

## 中文

v0.10.8 新增 commerce mark-as-paid certification evidence generation，并阻止 dry-run commerce artifact 通过 beta validation。

### 新增

- `pnpm beta:evidence:commerce` 会调用 RedeemLoop `/v1/commerce/confirm`，并写出 WooCommerce 或 Shopify certification evidence。
- 命令会记录 provider、store URL、order ID、PaymentIntent ID、payment ID、mark-paid status、dry-run status、timestamp 和 request URL。
- Beta evidence scaffold 现在会指向 WooCommerce commerce evidence 命令。

### 变更

- Commerce evidence validation 现在要求 `dryRun: false`。
- Commerce evidence validation 现在只接受 `paid` 或 `payment_complete` 作为 beta evidence 的 mark-paid status。

### 验证

- `node --check scripts/create-commerce-certification-evidence.mjs`
- `node scripts/create-commerce-certification-evidence.mjs --help`
- `corepack pnpm --silent beta:evidence:commerce -- --help`
- 本地 mock API commerce evidence generation 与 manifest validation：5 pass、1 个可选 Shopify warning、0 fail。
- Dry-run commerce artifact rejection：1 个预期失败项。
- `corepack pnpm verify`

### 剩余 Beta 缺口

该命令会调用 live commerce adapter，并可能改变 test-store order state。真实 beta evidence 仍需要在 settlement 确认后，对指定 WooCommerce 认证订单和可选 Shopify 认证订单执行。
