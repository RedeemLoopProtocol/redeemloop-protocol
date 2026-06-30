# RedeemLoop v0.10.6 Release Notes

## English

v0.10.6 adds a safe beta evidence scaffold for release operators.

### Added

- `pnpm beta:evidence:init` creates `evidence/beta-evidence.manifest.json` and the expected beta evidence artifact paths.
- The scaffold recommends `pnpm --silent ... --json > file` capture commands so pnpm lifecycle output does not corrupt JSON evidence files.
- Generated artifacts are intentionally failing placeholders, so they cannot pass beta validation until replaced with real external certification output.
- `evidence/` is ignored by Git by default because release evidence can include store URLs, order IDs, wallet addresses, transaction hashes, and deployment metadata.
- Release-note validation now rejects the `BETA_EVIDENCE_PLACEHOLDER` marker.

### Verification

- `node --check scripts/init-beta-evidence.mjs`
- `node scripts/init-beta-evidence.mjs --help`
- Scaffold generation into a temporary evidence directory.
- Placeholder manifest validation fails as expected.
- `corepack pnpm beta:evidence:init -- --help`
- `corepack pnpm verify`

### Remaining Beta Gap

The scaffold does not certify production support. Real beta evidence still requires Docker Compose smoke output, production readiness output, funded EVM wallet certification, WooCommerce mark-as-paid certification, and optional Shopify certification when Shopify live support is claimed.

## 中文

v0.10.6 新增安全的 beta evidence scaffold，服务发布执行人员。

### 新增

- `pnpm beta:evidence:init` 会生成 `evidence/beta-evidence.manifest.json` 和 beta evidence 所需 artifact 路径。
- Scaffold 推荐使用 `pnpm --silent ... --json > file` 采集命令，避免 pnpm lifecycle output 污染 JSON evidence 文件。
- 生成的 artifact 是故意失败的占位内容，只有替换为真实外部认证输出后，才可能通过 beta validation。
- 默认将 `evidence/` 加入 Git 忽略，因为 release evidence 可能包含店铺 URL、订单 ID、钱包地址、交易哈希和部署元数据。
- Release note 校验会拒绝 `BETA_EVIDENCE_PLACEHOLDER` 标记。

### 验证

- `node --check scripts/init-beta-evidence.mjs`
- `node scripts/init-beta-evidence.mjs --help`
- 在临时 evidence 目录中生成 scaffold。
- Placeholder manifest validation 按预期失败。
- `corepack pnpm beta:evidence:init -- --help`
- `corepack pnpm verify`

### 剩余 Beta 缺口

Scaffold 不等于生产认证。真实 beta evidence 仍需要 Docker Compose smoke 输出、production readiness 输出、funded EVM wallet certification、WooCommerce mark-as-paid certification，以及在声明 Shopify live support 时提供 Shopify certification。
