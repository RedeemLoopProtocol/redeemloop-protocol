# Codex Prompt - RedeemLoop v0.2

You are implementing RedeemLoop Protocol v0.2.

RedeemLoop is NOT a token issuance platform. Do not implement token issuance, contract deployment, rune etching, ordinal inscription, NFT minting, asset custody, marketplace, token pricing engine, logistics, inventory, tax, or after-sales systems.

RedeemLoop is a multi-chain voucher payment and settlement layer. Merchants bring their own voucher assets. The protocol binds those assets to product/service entitlements, verifies customer ownership, helps customers transfer the required asset to the merchant vault, verifies settlement, and notifies the merchant commerce system to mark the order as paid.

## Required architecture

Implement a pnpm monorepo:

```text
packages/core
packages/sdk
packages/react
packages/widget
packages/adapters
services/api
services/settlement-worker
services/commerce-bridge
apps/merchant-console
apps/demo-store
apps/pos-verifier
docs
examples
```

## First implementation target

Build v0.2 in this order:

1. `packages/core` type definitions and validators.
2. PaymentIntent state machine.
3. REST API for merchants, vaults, entitlements, bindings, payment intents, settlement proofs, webhooks.
4. Asset Binding Wizard UI in merchant console. No issuance UI.
5. EVM ERC-20 adapter: balance check, transfer request, transfer proof verification.
6. Demo commerce adapter or WooCommerce adapter: create pending order and mark order paid.
7. Widget / React pay button.
8. Webhook signing and idempotency.
9. Bitcoin / Fractal adapter interfaces: PSBT builder, wallet adapter, indexer adapter. Runtime can be stubbed in v0.2 if necessary.

## Non-negotiable constraints

- No issuer functions in core.
- No mint, deploy, etch, inscribe, launch token, tokenomics pages in merchant-console.
- No marketplace UI.
- No token-native pricing engine.
- Use `VoucherAssetDescriptor`, `Entitlement`, `RedemptionBinding`, `RedeemLoopPaymentIntent`, `VoucherPaymentProof` as core models.
- `collect` is the default settlement policy.
- `burn` is optional.
- `escrow` is reserved for later implementation.
- Webhooks must be signed and idempotent.
- PaymentIntents must expire.
- Merchant vault changes must require re-verification.

## Done means

- Demo can bind an existing ERC-20 token to a SKU.
- Product page displays Pay with Voucher button.
- User connects an EVM wallet.
- User transfers token to merchant vault.
- Settlement worker detects transfer.
- Commerce adapter marks order paid.
- Webhook delivers signed event.
- No issuance UI exists.
- Bitcoin / Fractal types and interfaces are present.
