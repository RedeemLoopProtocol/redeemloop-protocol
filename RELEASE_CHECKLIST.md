# RedeemLoop v0.2.0 Release Checklist

Use this checklist before publishing the v0.2 GitHub release.

## Repository

- [ ] Confirm branch contains only intended project files.
- [ ] Confirm generated files are ignored: `node_modules`, `.next`, `dist`, `out`, `cache`, `broadcast`, and `packages/contracts/lib`.
- [ ] Confirm `README.md` is bilingual and reflects v0.2 Phase 0.
- [ ] Confirm docs and whitepaper use Asset Binding, Voucher Tender, PaymentIntent, receipt confirmation, and mark-as-paid language.
- [ ] Confirm Solidity code is labeled as an EVM example, not a core issuance module.
- [ ] Confirm `CHANGELOG.md`, `SECURITY.md`, and `CONTRIBUTING.md` are present.

## Verification

```bash
pnpm install
cd packages/contracts
forge install foundry-rs/forge-std --no-git
cd ../..
pnpm verify
pnpm audit --audit-level moderate
```

Expected:

- core/adapters/sdk/API/POS type checks pass
- core/adapters/sdk/API/POS tests pass
- Foundry example contract tests pass
- all builds pass
- audit reports no known moderate-or-higher vulnerabilities

## Local Demo

- [ ] Start `pnpm api:dev`.
- [ ] Start `pnpm pos:dev`.
- [ ] Open `http://localhost:3000`.
- [ ] Create Asset Binding.
- [ ] Create PaymentIntent.
- [ ] Request Transfer.
- [ ] Confirm Receipt.
- [ ] Confirm dry-run WooCommerce/Shopify/custom mark-as-paid output appears.

## GitHub Release

- [ ] Tag `v0.2.0`.
- [ ] Use `CHANGELOG.md` as the release body.
- [ ] Mark the release as pre-production/prototype.
- [ ] Note that contracts are unaudited example code.
