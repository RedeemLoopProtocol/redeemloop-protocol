# RedeemLoop v0.10.24 Release Notes

## English

v0.10.24 tightens the beta evidence chain so WooCommerce mark-as-paid evidence must be tied to the same funded EVM payment evidence before the first public beta can be published.

### Changed

- WooCommerce commerce certification artifacts now include settlement identity fields: chain ID, merchant ID, voucher token, amount, receiver, and transaction hash.
- The WooCommerce certification workflow now requires the settlement transaction hash.
- The beta evidence scaffold now shows those fields in the WooCommerce placeholder artifact.
- `pnpm beta:evidence:check` now validates commerce settlement identity fields.
- `pnpm beta:evidence:check` now compares required EVM and WooCommerce artifacts across PaymentIntent ID, chain ID, transaction hash, voucher token, receiver, and amount.
- `pnpm beta:release:gate` now checks that the WooCommerce certification workflow keeps `tx_hash` required.
- Beta readiness docs now describe the cross-artifact consistency requirement.

### Verification

- `node --check scripts/create-commerce-certification-evidence.mjs`
- `node --check scripts/check-beta-evidence.mjs`
- `node --check scripts/init-beta-evidence.mjs`
- `node --check scripts/beta-release-gate.mjs`
- Fixture-based `pnpm beta:evidence:check` pass/fail checks for matched and mismatched EVM/WooCommerce evidence.
- `corepack pnpm --silent beta:release:preflight -- --manifest docs/examples/beta-evidence.manifest.example.json --github --repo RedeemLoopProtocol/redeemloop-protocol --json`

### Remaining Beta Gap

This release strengthens the evidence gate, but it does not create live evidence. The first public beta still requires the commerce certification API key, a funded EVM wallet certification artifact, a live WooCommerce mark-as-paid artifact, and the generated public-safe bilingual beta release notes.

## 中文

v0.10.24 收紧 beta evidence chain。首个公开 beta 发布前，WooCommerce mark-as-paid evidence 必须与同一笔 funded EVM payment evidence 绑定一致。

### 变更

- WooCommerce commerce certification artifact 现在会包含 settlement identity 字段：chain ID、merchant ID、voucher token、amount、receiver 和 transaction hash。
- WooCommerce certification workflow 现在要求必须填写 settlement transaction hash。
- Beta evidence scaffold 的 WooCommerce placeholder artifact 也补充了这些字段。
- `pnpm beta:evidence:check` 现在会校验 commerce settlement identity 字段。
- `pnpm beta:evidence:check` 现在会对必需的 EVM 与 WooCommerce artifacts 做一致性比对，覆盖 PaymentIntent ID、chain ID、transaction hash、voucher token、receiver 和 amount。
- `pnpm beta:release:gate` 现在会检查 WooCommerce certification workflow 是否保持 `tx_hash` 必填。
- Beta readiness 文档补充 cross-artifact consistency 要求。

### 验证

- `node --check scripts/create-commerce-certification-evidence.mjs`
- `node --check scripts/check-beta-evidence.mjs`
- `node --check scripts/init-beta-evidence.mjs`
- `node --check scripts/beta-release-gate.mjs`
- 使用 fixture 验证 `pnpm beta:evidence:check` 对匹配和不匹配的 EVM/WooCommerce evidence 分别通过/失败。
- `corepack pnpm --silent beta:release:preflight -- --manifest docs/examples/beta-evidence.manifest.example.json --github --repo RedeemLoopProtocol/redeemloop-protocol --json`

### 剩余 Beta 缺口

本版本加固 evidence gate，但不会生成 live evidence。首个公开 beta 仍需要 commerce certification API key、funded EVM wallet certification artifact、真实 WooCommerce mark-as-paid artifact，以及生成后的公开安全双语 beta release notes。
