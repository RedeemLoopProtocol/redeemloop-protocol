# RedeemLoop v0.1.0 Release Checklist

Use this checklist before publishing the first GitHub release.

## Repository

- [ ] Confirm branch contains only intended project files.
- [ ] Confirm generated files are ignored:
  - `node_modules`
  - `.next`
  - `dist`
  - `out`
  - `cache`
  - `broadcast`
  - `packages/contracts/lib`
- [ ] Confirm `README.md` quickstart works from a fresh checkout.
- [ ] Confirm `CHANGELOG.md` has the release date and summary.
- [ ] Confirm `SECURITY.md` and `CONTRIBUTING.md` are present.

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

- contract format check passes
- API/POS type checks pass
- contract tests pass
- API/POS tests pass
- API/POS builds pass
- audit reports no known vulnerabilities

## Local Demo

- [ ] Start `pnpm anvil`.
- [ ] Deploy with `DeployPhase0.s.sol`.
- [ ] Start `pnpm api:dev`.
- [ ] Start `pnpm pos:dev`.
- [ ] Open `http://localhost:3000`.
- [ ] Register terminal.
- [ ] Save merchant receiver address.
- [ ] Create EVM voucher payment with `Pay`.
- [ ] Create redemption intent.
- [ ] Sign EIP-712 authorization.
- [ ] Submit through relayer.
- [ ] Dry-run mark Shopify/WooCommerce/custom order as paid.

## GitHub Release

- [ ] Tag `v0.1.0`.
- [ ] Use `CHANGELOG.md` as the release body.
- [ ] Mark the release as pre-production/prototype.
- [ ] Note that contracts are unaudited.
