# Contributing

Thanks for contributing to RedeemLoop.

## Scope Discipline

The current public release is v0.2 Phase 0. Keep changes focused on:

- Asset Binding for existing voucher assets.
- Voucher Tender and PaymentIntent flows.
- Merchant receiving address / vault confirmation.
- Settlement proof validation and idempotency.
- Commerce mark-as-paid adapters.
- Adapter interfaces for EVM, Bitcoin, Fractal, wallets, and indexers.

Do not add token launch flows, merchant token deployers, Rune etching, Ordinal inscription, NFT minting, secondary markets, token pricing engines, custody, inventory, logistics, tax, or after-sales systems to the core product.

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

For EVM example contract-only changes:

```bash
pnpm contracts:test
pnpm --filter @redeemloop/example-evm-erc20-voucher lint
```

## Pull Request Expectations

- Keep behavioral scope small.
- Add tests for new behavior.
- Update docs when commands, APIs, or package behavior change.
- Preserve the non-issuing protocol boundary.
- Do not commit generated folders such as `node_modules`, `.next`, `dist`, `out`, `cache`, or `packages/contracts/lib`.
- Do not put private user data, API keys, seed phrases, or production private keys in the repository.
