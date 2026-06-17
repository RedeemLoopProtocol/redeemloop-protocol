# Contributing

Thanks for contributing to RedeemLoop.

## Scope Discipline

The current public release is Phase 0. Keep changes focused on:

- ERC-20 FT vouchers
- `BURN` and `COLLECT`
- EIP-712 redemption authorization
- POS verifier demo
- basic relayer behavior

Do not add NFT, marketplace, points, bridge, KYC, inventory, ERC-6909, or ERC-1155 functionality unless the roadmap phase explicitly changes.

## Local Setup

```bash
pnpm install
cd packages/contracts
forge install foundry-rs/forge-std --no-git
cd ../..
```

## Required Checks

Before opening a pull request:

```bash
pnpm verify
pnpm audit --audit-level moderate
```

For contract-only changes:

```bash
pnpm contracts:test
pnpm --filter @redeemloop/contracts lint
```

## Pull Request Expectations

- Keep the behavioral scope small.
- Add tests for new behavior.
- Update docs when commands, APIs, or contract behavior change.
- Do not commit generated folders such as `node_modules`, `.next`, `dist`, `out`, `cache`, or `packages/contracts/lib`.
- Do not put private user data, API keys, seed phrases, or production private keys in the repository.
